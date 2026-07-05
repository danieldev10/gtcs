import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ApplicationStatus,
  ClearanceDecision,
  ClearanceStage,
  DocumentType,
  Prisma,
  RoleName,
} from '@prisma/client';
import { z } from 'zod';
import { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

const presignUploadSchema = z.object({
  documentType: z.nativeEnum(DocumentType),
  contentType: z.string().min(1).default('application/pdf'),
});

const completeUploadSchema = z.object({
  documentType: z.nativeEnum(DocumentType),
  bucket: z.string().trim().min(1),
  key: z.string().trim().min(1),
  originalName: z.string().trim().max(255).nullable().optional(),
  mimeType: z.string().trim().max(120).nullable().optional(),
  sizeBytes: z.coerce.number().int().positive().max(25 * 1024 * 1024).nullable().optional(),
});

const bursaryReceiptPurpose = 'BURSARY_PAYMENT_RECEIPT';

const requiredDocuments = [
  {
    type: DocumentType.JAMB_ADMISSION_LETTER,
    label: 'JAMB admission letter',
    description: 'Official admission letter used to confirm entry record.',
    required: true,
  },
  {
    type: DocumentType.JAMB_RESULT_SLIP,
    label: 'JAMB result slip',
    description: 'Result slip for admission documentation.',
    required: true,
  },
  {
    type: DocumentType.NIN_SLIP,
    label: 'NIN slip',
    description: 'National Identification Number slip or equivalent ID document.',
    required: true,
  },
  {
    type: DocumentType.CREDIT_AUDIT_SHEET,
    label: 'Credit audit sheet',
    description: 'Completed SITC credit audit sheet reviewed with the Program Chair.',
    required: true,
  },
  {
    type: DocumentType.UNOFFICIAL_TRANSCRIPT,
    label: 'Unofficial transcript',
    description: 'Most recent unofficial transcript for academic review.',
    required: true,
  },
  {
    type: DocumentType.SUPPORTING_DOCUMENT,
    label: 'Supporting document',
    description: 'Optional extra file requested by SITC or Registry.',
    required: false,
  },
] as const;

const requiredOpenErpCheckKeys = [
  'concentrationDeclared',
  'majorAccurate',
  'concentrationAccurate',
  'minorAccurate',
  'fullNameAccurate',
  'dateOfBirthAccurate',
  'genderAccurate',
  'stateOfOriginAccurate',
  'catalogYearAccurate',
] as const;

type CurrentApplication = Prisma.GraduationApplicationGetPayload<{
  include: {
    documents: true;
    surveyResponse: true;
  };
}>;

type RegistryDocumentRequest = {
  completed: boolean;
  requestedAt: string;
  requiredDocumentTypes: DocumentType[];
};

@Injectable()
export class DocumentsService {
  constructor(
    private readonly storageService: StorageService,
    private readonly prisma: PrismaService,
  ) {}

  async listMyDocuments(user: AuthenticatedUser) {
    const application = await this.getCurrentApplication(user);

    return this.serializeDocumentState(application);
  }

  async presignMyUpload(user: AuthenticatedUser, input: unknown) {
    const parsed = presignUploadSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const application = await this.getCurrentApplication(user);
    this.assertApplicationReadyForDocuments(application);

    return this.storageService.createPresignedUpload({
      applicationId: application.id,
      documentType: parsed.data.documentType.toLowerCase(),
      contentType: parsed.data.contentType,
    });
  }

  async completeMyUpload(user: AuthenticatedUser, input: unknown) {
    const parsed = completeUploadSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const application = await this.getCurrentApplication(user);
    this.assertApplicationReadyForDocuments(application);

    const expectedPrefix = [
      'graduation-applications',
      application.id,
      parsed.data.documentType.toLowerCase(),
      '',
    ].join('/');

    if (!parsed.data.key.startsWith(expectedPrefix)) {
      throw new BadRequestException('Upload key does not belong to this application document slot.');
    }

    await this.prisma.documentUpload.create({
      data: {
        applicationId: application.id,
        type: parsed.data.documentType,
        bucket: parsed.data.bucket,
        storageKey: parsed.data.key,
        originalName: this.cleanOptionalText(parsed.data.originalName),
        mimeType: this.cleanOptionalText(parsed.data.mimeType),
        sizeBytes: parsed.data.sizeBytes ?? null,
      },
    });

    const updatedApplication = await this.getCurrentApplication(user);
    await this.updateEligibilitySnapshot(updatedApplication);
    await this.maybeReturnToRegistryIntakeAfterDocumentUpload(updatedApplication, user);
    const refreshedApplication = await this.getCurrentApplication(user);

    return this.serializeDocumentState(refreshedApplication);
  }

  async presignBursaryReceiptUpload(user: AuthenticatedUser, input: unknown) {
    const parsed = z
      .object({
        contentType: z.string().min(1).default('application/pdf'),
      })
      .safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const application = await this.getCurrentApplication(user);
    this.assertBursaryReceiptUploadAllowed(application);

    return this.storageService.createPresignedUpload({
      applicationId: application.id,
      documentType: 'bursary_payment_receipt',
      contentType: parsed.data.contentType,
    });
  }

  async completeBursaryReceiptUpload(user: AuthenticatedUser, input: unknown) {
    const parsed = completeUploadSchema
      .omit({ documentType: true })
      .extend({
        amountPaid: z.coerce.number().positive().nullable().optional(),
        paymentReference: z.string().trim().max(120).nullable().optional(),
      })
      .safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const application = await this.getCurrentApplication(user);
    this.assertBursaryReceiptUploadAllowed(application);

    const expectedPrefix = ['graduation-applications', application.id, 'bursary_payment_receipt', ''].join('/');

    if (!parsed.data.key.startsWith(expectedPrefix)) {
      throw new BadRequestException('Upload key does not belong to this application receipt slot.');
    }

    const uploadedAt = new Date();
    const document = await this.prisma.documentUpload.create({
      data: {
        applicationId: application.id,
        type: DocumentType.SUPPORTING_DOCUMENT,
        bucket: parsed.data.bucket,
        storageKey: parsed.data.key,
        originalName: this.cleanOptionalText(parsed.data.originalName),
        mimeType: this.cleanOptionalText(parsed.data.mimeType),
        sizeBytes: parsed.data.sizeBytes ?? null,
        verification: {
          purpose: bursaryReceiptPurpose,
          status: 'PENDING_REVIEW',
          amountPaid: parsed.data.amountPaid ?? null,
          paymentReference: this.cleanOptionalText(parsed.data.paymentReference),
          uploadedAt: uploadedAt.toISOString(),
        },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        applicationId: application.id,
        actorId: user.id,
        entityType: 'DocumentUpload',
        entityId: document.id,
        action: 'BURSARY_RECEIPT_UPLOADED',
        metadata: {
          amountPaid: parsed.data.amountPaid ?? null,
          originalName: this.cleanOptionalText(parsed.data.originalName),
          paymentReference: this.cleanOptionalText(parsed.data.paymentReference),
          uploadedAt: uploadedAt.toISOString(),
        },
      },
    });

    await this.markBursaryReceiptUploaded(application);

    const updatedApplication = await this.getCurrentApplication(user);

    return this.serializeDocumentState(updatedApplication);
  }

  private async getCurrentApplication(user: AuthenticatedUser) {
    if (user.role !== RoleName.STUDENT) {
      throw new BadRequestException('Only student accounts can manage graduation documents.');
    }

    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!profile) {
      throw new NotFoundException('Student profile was not found for this account.');
    }

    const application = await this.prisma.graduationApplication.findFirst({
      where: {
        studentProfileId: profile.id,
        status: {
          notIn: [ApplicationStatus.COMPLETED, ApplicationStatus.WITHDRAWN],
        },
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        documents: {
          orderBy: { createdAt: 'desc' },
        },
        surveyResponse: true,
      },
    });

    if (!application) {
      throw new NotFoundException('Start a graduation application before uploading documents.');
    }

    return application;
  }

  private assertApplicationReadyForDocuments(application: CurrentApplication) {
    if (!this.canStudentEditApplication(application.status)) {
      throw new BadRequestException('This application has already been submitted for review.');
    }

    if (
      !application.nameOnCertificate?.trim() ||
      !application.certificateMailingAddress?.trim() ||
      !this.openErpChecksComplete(application.openErpChecks) ||
      !application.studentAttestationAcceptedAt
    ) {
      throw new BadRequestException('Complete and save the graduation application before uploading documents.');
    }
  }

  private assertBursaryReceiptUploadAllowed(application: CurrentApplication) {
    if (application.status !== ApplicationStatus.BURSARY_NOT_CLEARED) {
      throw new BadRequestException('A Bursary payment receipt is only needed after Bursary requests payment.');
    }
  }

  private canStudentEditApplication(status: ApplicationStatus) {
    return status === ApplicationStatus.DRAFT || status === ApplicationStatus.RETURNED_TO_STUDENT;
  }

  private openErpChecksComplete(value: Prisma.JsonValue | null) {
    const record = value && typeof value === 'object' && !Array.isArray(value) ? value : {};

    return requiredOpenErpCheckKeys.every((key) => {
      const answer = (record as Record<string, unknown>)[key];

      return answer === 'YES' || answer === 'NO';
    });
  }

  private serializeDocumentState(application: CurrentApplication) {
    const latestByType = new Map<DocumentType, CurrentApplication['documents'][number]>();

    for (const document of application.documents) {
      if (!latestByType.has(document.type)) {
        latestByType.set(document.type, document);
      }
    }

    const checklist = requiredDocuments.map((definition) => ({
      ...definition,
      uploaded: latestByType.has(definition.type),
      upload: latestByType.has(definition.type)
        ? this.serializeDocument(latestByType.get(definition.type) as CurrentApplication['documents'][number])
        : null,
    }));

    return {
      applicationId: application.id,
      requiredComplete: checklist.filter((item) => item.required).every((item) => item.uploaded),
      documentCount: application.documents.length,
      requiredDocuments: checklist,
      bursaryReceiptRequired: application.status === ApplicationStatus.BURSARY_NOT_CLEARED,
      bursaryReceipt: this.serializeBursaryReceipt(application.documents),
      documents: application.documents.map((document) => this.serializeDocument(document)),
    };
  }

  private serializeDocument(document: CurrentApplication['documents'][number]) {
    return {
      id: document.id,
      type: document.type,
      bucket: document.bucket,
      storageKey: document.storageKey,
      originalName: document.originalName,
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes,
      verifiedAt: document.verifiedAt,
      verification: document.verification,
      createdAt: document.createdAt,
    };
  }

  private serializeBursaryReceipt(documents: CurrentApplication['documents']) {
    const receipt = documents.find((document) => this.isBursaryReceipt(document));

    return receipt ? this.serializeDocument(receipt) : null;
  }

  private isBursaryReceipt(document: CurrentApplication['documents'][number]) {
    const verification =
      document.verification && typeof document.verification === 'object' && !Array.isArray(document.verification)
        ? (document.verification as Record<string, unknown>)
        : {};

    return verification.purpose === bursaryReceiptPurpose;
  }

  private async markBursaryReceiptUploaded(application: CurrentApplication) {
    const eligibility =
      application.eligibility && typeof application.eligibility === 'object' && !Array.isArray(application.eligibility)
        ? (application.eligibility as Record<string, unknown>)
        : {};
    const paymentRequest =
      eligibility.bursaryPaymentRequest &&
      typeof eligibility.bursaryPaymentRequest === 'object' &&
      !Array.isArray(eligibility.bursaryPaymentRequest)
        ? (eligibility.bursaryPaymentRequest as Record<string, unknown>)
        : {};

    await this.prisma.graduationApplication.update({
      where: { id: application.id },
      data: {
        eligibility: {
          ...eligibility,
          bursaryPaymentRequest: {
            ...paymentRequest,
            receiptUploaded: true,
            receiptUploadedAt: new Date().toISOString(),
          },
        },
      },
    });
  }

  private async updateEligibilitySnapshot(application: CurrentApplication) {
    const documentTypes = new Set(application.documents.map((document) => document.type));
    const documentsComplete = requiredDocuments
      .filter((document) => document.required)
      .every((document) => documentTypes.has(document.type));
    const eligibility = this.readEligibility(application.eligibility);

    await this.prisma.graduationApplication.update({
      where: { id: application.id },
      data: {
        eligibility: {
          ...eligibility,
          status: documentsComplete ? 'DOCUMENTS_READY' : 'DOCUMENTS_IN_PROGRESS',
          profileComplete: true,
          applicationFormComplete: true,
          documentCount: application.documents.length,
          documentsComplete,
          surveySubmitted: Boolean(application.surveyResponse?.submittedAt),
          finalSubmissionReady: documentsComplete && Boolean(application.surveyResponse?.submittedAt),
        },
      },
    });
  }

  private async maybeReturnToRegistryIntakeAfterDocumentUpload(
    application: CurrentApplication,
    user: AuthenticatedUser,
  ) {
    if (application.status !== ApplicationStatus.RETURNED_TO_STUDENT) {
      return;
    }

    const request = this.readRegistryDocumentRequest(application.eligibility);

    if (!request || request.completed || !this.isRegistryDocumentRequestSatisfied(application, request)) {
      return;
    }

    const completedAt = new Date();
    const eligibility = this.readEligibility(application.eligibility);
    const completedRequest = {
      ...(eligibility.registryDocumentRequest &&
      typeof eligibility.registryDocumentRequest === 'object' &&
      !Array.isArray(eligibility.registryDocumentRequest)
        ? (eligibility.registryDocumentRequest as Record<string, unknown>)
        : {}),
      completed: true,
      completedAt: completedAt.toISOString(),
    };

    await this.prisma.$transaction([
      this.prisma.clearanceTask.upsert({
        where: {
          applicationId_stage: {
            applicationId: application.id,
            stage: ClearanceStage.REGISTRY_INTAKE,
          },
        },
        update: {
          decision: ClearanceDecision.PENDING,
          remarks: null,
          decidedAt: null,
        },
        create: {
          applicationId: application.id,
          stage: ClearanceStage.REGISTRY_INTAKE,
          decision: ClearanceDecision.PENDING,
        },
      }),

      this.prisma.auditLog.create({
        data: {
          applicationId: application.id,
          actorId: user.id,
          entityType: 'GraduationApplication',
          entityId: application.id,
          action: 'REGISTRY_DOCUMENTS_RESUBMITTED',
          metadata: {
            completedAt: completedAt.toISOString(),
            requiredDocumentTypes: request.requiredDocumentTypes,
          },
        },
      }),

      this.prisma.graduationApplication.update({
        where: { id: application.id },
        data: {
          status: ApplicationStatus.REGISTRY_INTAKE_REVIEW,
          eligibility: {
            ...eligibility,
            registryDocumentRequest: completedRequest,
          },
        },
      }),
    ]);
  }

  private readRegistryDocumentRequest(value: Prisma.JsonValue | null): RegistryDocumentRequest | null {
    const eligibility = this.readEligibility(value);
    const request =
      eligibility.registryDocumentRequest &&
      typeof eligibility.registryDocumentRequest === 'object' &&
      !Array.isArray(eligibility.registryDocumentRequest)
        ? (eligibility.registryDocumentRequest as Record<string, unknown>)
        : null;

    if (!request) {
      return null;
    }

    const requiredDocumentTypes = Array.isArray(request.requiredDocumentTypes)
      ? request.requiredDocumentTypes.filter((value): value is DocumentType => this.isDocumentType(value))
      : [];

    if (requiredDocumentTypes.length === 0) {
      return null;
    }

    return {
      completed: request.completed === true,
      requestedAt: typeof request.requestedAt === 'string' ? request.requestedAt : '',
      requiredDocumentTypes,
    };
  }

  private isRegistryDocumentRequestSatisfied(
    application: CurrentApplication,
    request: RegistryDocumentRequest,
  ) {
    const requestedAtMs = Date.parse(request.requestedAt);

    return request.requiredDocumentTypes.every((documentType) =>
      application.documents.some((document) => {
        if (document.type !== documentType) {
          return false;
        }

        return Number.isFinite(requestedAtMs) ? document.createdAt.getTime() >= requestedAtMs : true;
      }),
    );
  }

  private readEligibility(value: Prisma.JsonValue | null) {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Prisma.JsonObject)
      : {};
  }

  private isDocumentType(value: unknown): value is DocumentType {
    return typeof value === 'string' && Object.values(DocumentType).includes(value as DocumentType);
  }

  private cleanOptionalText(value: string | null | undefined) {
    return value?.trim() ? value.trim() : null;
  }
}
