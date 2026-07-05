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
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

const createDraftSchema = z.object({
  studentId: z.string().min(3).default('A00000000'),
  email: z.string().email().default('student@aun.edu.ng'),
  firstName: z.string().min(1).default('Demo'),
  middleName: z.string().optional(),
  lastName: z.string().min(1).default('Student'),
  termName: z.string().min(1).default('Pilot Graduation Term'),
  currentGpa: z.coerce.number().min(0).max(4).optional(),
  phone: z.string().optional(),
  shippingAddress: z.string().optional(),
});

const optionalText = (max = 500) => z.string().trim().max(max).nullable().optional();
const openErpAccuracySchema = z.object({
  concentrationDeclared: z.enum(['YES', 'NO']).nullable().optional(),
  majorAccurate: z.enum(['YES', 'NO']).nullable().optional(),
  concentrationAccurate: z.enum(['YES', 'NO']).nullable().optional(),
  minorAccurate: z.enum(['YES', 'NO']).nullable().optional(),
  fullNameAccurate: z.enum(['YES', 'NO']).nullable().optional(),
  dateOfBirthAccurate: z.enum(['YES', 'NO']).nullable().optional(),
  genderAccurate: z.enum(['YES', 'NO']).nullable().optional(),
  stateOfOriginAccurate: z.enum(['YES', 'NO']).nullable().optional(),
  catalogYearAccurate: z.enum(['YES', 'NO']).nullable().optional(),
});

const updateStudentApplicationSchema = z.object({
  certificateMailingAddress: optionalText(500),
  openErpChecks: openErpAccuracySchema.optional(),
  studentRemarks: optionalText(1000),
  attestationAccepted: z.boolean().optional(),
});

const bursaryPaymentRequestSchema = z.object({
  amount: z.coerce.number().positive(),
  currency: z.string().trim().min(2).max(8).default('NGN'),
  note: z.string().trim().min(3).max(1000),
});

const requiredClearanceCheck = z.boolean().refine((value) => value, {
  message: 'This clearance checkbox must be ticked before signoff.',
});

const bursaryClearanceSchema = z.object({
  financiallyCleared: requiredClearanceCheck,
  remarks: z.string().trim().min(3).max(1000),
});

const registryIntakeClearanceSchema = z.object({
  graduationRequirementsSatisfied: requiredClearanceCheck,
  jambAdmissionLetterAttached: requiredClearanceCheck,
  jambResultSlipAttached: requiredClearanceCheck,
  graduationSurveyCompleted: requiredClearanceCheck,
  ninSlipAttached: requiredClearanceCheck,
  creditAuditAttached: requiredClearanceCheck,
  unofficialTranscriptAttached: requiredClearanceCheck,
  remarks: z.string().trim().max(1000).nullable().optional(),
});

const registryIntakeDocumentRequestSchema = z.object({
  graduationRequirementsSatisfied: z.boolean().optional().default(false),
  jambAdmissionLetterAttached: z.boolean().optional().default(false),
  jambResultSlipAttached: z.boolean().optional().default(false),
  graduationSurveyCompleted: z.boolean().optional().default(false),
  ninSlipAttached: z.boolean().optional().default(false),
  creditAuditAttached: z.boolean().optional().default(false),
  unofficialTranscriptAttached: z.boolean().optional().default(false),
  remarks: z.string().trim().min(3).max(1000),
});

const staffClearanceDecisionSchema = z.object({
  decision: z.enum(['CLEARED', 'NOT_CLEARED']),
  comments: z.string().trim().min(3).max(1000),
});

const finalRegistryClearanceSchema = z.object({
  completionTerm: z.enum(['Fall', 'Spring', 'Summer']),
  finalGpa: z.coerce.number().min(0).max(4),
  degreeHonors: z.string().trim().min(1).max(120),
  comments: z.string().trim().max(1000).nullable().optional(),
});

const bursaryReceiptPurpose = 'BURSARY_PAYMENT_RECEIPT';

const requiredDocumentTypes = [
  DocumentType.JAMB_ADMISSION_LETTER,
  DocumentType.JAMB_RESULT_SLIP,
  DocumentType.NIN_SLIP,
  DocumentType.CREDIT_AUDIT_SHEET,
  DocumentType.UNOFFICIAL_TRANSCRIPT,
] as const;

type OpenErpAccuracyChecks = z.infer<typeof openErpAccuracySchema>;

const openErpAccuracyKeys = [
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

type StudentApplication = Prisma.GraduationApplicationGetPayload<{
  include: {
    auditLogs: {
      include: {
        actor: {
          select: {
            id: true;
            email: true;
            name: true;
            role: true;
          };
        };
      };
    };
    term: true;
    documents: true;
    clearanceTasks: true;
    surveyResponse: true;
    studentProfile: {
      include: {
        program: true;
      };
    };
  };
}>;

type BursaryApplication = Prisma.GraduationApplicationGetPayload<{
  include: {
    term: true;
    documents: true;
    clearanceTasks: true;
    studentProfile: {
      include: {
        program: true;
        user: true;
      };
    };
  };
}>;

type BursaryPaymentRequest = {
  amount: number;
  currency: string;
  note: string;
  requestedAt: string;
  requestedById: string;
  receiptUploaded: boolean;
};

type RegistryIntakeChecklist = z.infer<typeof registryIntakeClearanceSchema>;
type RegistryIntakeDocumentRequestInput = z.infer<typeof registryIntakeDocumentRequestSchema>;
type RegistryDocumentRequest = {
  checklist: RegistryIntakeDocumentRequestInput;
  completed: boolean;
  completedAt: string | null;
  missingChecks: string[];
  remarks: string;
  requestedAt: string;
  requestedById: string;
  requiredDocumentTypes: DocumentType[];
};

const registryIntakeDocumentRequirements = [
  {
    key: 'jambAdmissionLetterAttached',
    label: 'JAMB admission letter',
    type: DocumentType.JAMB_ADMISSION_LETTER,
  },
  {
    key: 'jambResultSlipAttached',
    label: 'JAMB result slip',
    type: DocumentType.JAMB_RESULT_SLIP,
  },
  {
    key: 'ninSlipAttached',
    label: 'NIN slip',
    type: DocumentType.NIN_SLIP,
  },
  {
    key: 'creditAuditAttached',
    label: 'Credit audit sheet',
    type: DocumentType.CREDIT_AUDIT_SHEET,
  },
  {
    key: 'unofficialTranscriptAttached',
    label: 'Unofficial transcript',
    type: DocumentType.UNOFFICIAL_TRANSCRIPT,
  },
] as const;

const registryIntakeDocumentRequestChecks = [
  {
    key: 'graduationRequirementsSatisfied',
    label: 'Student has satisfied all graduation requirements',
  },
  {
    key: 'jambAdmissionLetterAttached',
    label: 'JAMB admission letter is attached',
  },
  {
    key: 'jambResultSlipAttached',
    label: 'JAMB result slip is attached',
  },
  {
    key: 'graduationSurveyCompleted',
    label: 'Graduation survey form is completed and attached',
  },
  {
    key: 'ninSlipAttached',
    label: 'NIN slip is attached',
  },
  {
    key: 'creditAuditAttached',
    label: 'Credit audit is attached',
  },
  {
    key: 'unofficialTranscriptAttached',
    label: 'Unofficial transcript is attached',
  },
] as const satisfies ReadonlyArray<{
  key: Exclude<keyof RegistryIntakeDocumentRequestInput, 'remarks'>;
  label: string;
}>;

function toPlainRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly storageService: StorageService,
  ) {}

  async findMany() {
    const applications = await this.prisma.graduationApplication.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        studentProfile: {
          include: {
            program: true,
          },
        },
        term: true,
        documents: true,
        clearanceTasks: true,
      },
    });

    return applications.map((application) => ({
      id: application.id,
      status: application.status,
      createdAt: application.createdAt,
      submittedAt: application.submittedAt,
      term: application.term.name,
      documentCount: application.documents.length,
      clearanceCount: application.clearanceTasks.length,
      student: {
        id: application.studentProfile.studentId,
        name: [
          application.studentProfile.firstName,
          application.studentProfile.middleName,
          application.studentProfile.lastName,
        ]
          .filter(Boolean)
          .join(' '),
        program: application.studentProfile.program?.code ?? 'Unassigned',
      },
    }));
  }

  async createDraft(input: unknown) {
    const parsed = createDraftSchema.safeParse(input ?? {});

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const data = parsed.data;

    const user = await this.prisma.user.upsert({
      where: { email: data.email },
      update: {
        name: [data.firstName, data.middleName, data.lastName].filter(Boolean).join(' '),
      },
      create: {
        email: data.email,
        name: [data.firstName, data.middleName, data.lastName].filter(Boolean).join(' '),
      },
    });

    const term = await this.prisma.academicTerm.upsert({
      where: { name: data.termName },
      update: {},
      create: { name: data.termName },
    });

    const profile = await this.prisma.studentProfile.upsert({
      where: { studentId: data.studentId },
      update: {
        firstName: data.firstName,
        middleName: data.middleName,
        lastName: data.lastName,
        currentGpa: data.currentGpa,
        phone: data.phone,
        shippingAddress: data.shippingAddress,
      },
      create: {
        userId: user.id,
        studentId: data.studentId,
        firstName: data.firstName,
        middleName: data.middleName,
        lastName: data.lastName,
        currentGpa: data.currentGpa,
        phone: data.phone,
        shippingAddress: data.shippingAddress,
      },
    });

    const application = await this.prisma.graduationApplication.create({
      data: {
        studentProfileId: profile.id,
        termId: term.id,
      },
      include: {
        studentProfile: true,
        term: true,
      },
    });

    return {
      id: application.id,
      status: application.status,
      term: application.term.name,
      student: {
        id: application.studentProfile.studentId,
        name: [
          application.studentProfile.firstName,
          application.studentProfile.middleName,
          application.studentProfile.lastName,
        ]
          .filter(Boolean)
          .join(' '),
      },
    };
  }

  async getCurrentStudentApplication(user: AuthenticatedUser) {
    const profile = await this.getStudentProfile(user);
    const application = await this.findCurrentApplication(profile.id);

    return application ? this.serializeStudentApplication(application) : null;
  }

  async startStudentApplication(user: AuthenticatedUser) {
    const profile = await this.getStudentProfile(user);
    this.assertProfileReady(profile);

    const term = await this.prisma.academicTerm.upsert({
      where: { name: profile.expectedGraduationTerm as string },
      update: {},
      create: { name: profile.expectedGraduationTerm as string },
    });

    const existingApplication = await this.findCurrentApplication(profile.id, term.id);

    if (existingApplication) {
      return this.serializeStudentApplication(existingApplication);
    }

    const application = await this.prisma.graduationApplication.create({
      data: {
        studentProfileId: profile.id,
        termId: term.id,
        completionTerm: profile.expectedGraduationTerm,
        finalGpa: profile.currentGpa,
        openErpChecks: this.normalizeOpenErpChecks(null),
        eligibility: this.createEligibilitySnapshot({
          applicationFormComplete: false,
          documentCount: 0,
          profileComplete: true,
          surveySubmitted: false,
        }),
        nameOnCertificate: this.getProfileName(profile),
        certificateMailingAddress: profile.shippingAddress,
      },
      include: this.studentApplicationInclude,
    });

    return this.serializeStudentApplication(application);
  }

  async updateCurrentStudentApplication(user: AuthenticatedUser, input: unknown) {
    const parsed = updateStudentApplicationSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const profile = await this.getStudentProfile(user);
    const application = await this.findCurrentApplication(profile.id);

    if (!application) {
      throw new NotFoundException('Start a graduation application before saving application details.');
    }

    if (!this.canStudentEditApplication(application.status)) {
      throw new BadRequestException('This application has already been submitted for review.');
    }

    const updateData: Prisma.GraduationApplicationUpdateInput = {};
    const nextAttestationAcceptedAt =
      parsed.data.attestationAccepted === undefined
        ? application.studentAttestationAcceptedAt
        : parsed.data.attestationAccepted
        ? new Date()
        : null;
    const profileName = this.getProfileName(profile);
    const nextOpenErpChecks =
      parsed.data.openErpChecks === undefined
        ? this.normalizeOpenErpChecks(application.openErpChecks)
        : this.normalizeOpenErpChecks(parsed.data.openErpChecks);

    updateData.nameOnCertificate = profileName;
    updateData.openErpChecks = nextOpenErpChecks;

    if (parsed.data.certificateMailingAddress !== undefined) {
      updateData.certificateMailingAddress = this.cleanOptionalText(
        parsed.data.certificateMailingAddress,
      );
    }

    if (parsed.data.studentRemarks !== undefined) {
      updateData.studentRemarks = this.cleanOptionalText(parsed.data.studentRemarks);
    }

    if (parsed.data.attestationAccepted !== undefined) {
      updateData.studentAttestationAcceptedAt = nextAttestationAcceptedAt;
    }

    updateData.eligibility = this.mergeEligibility(
      application.eligibility,
      this.createEligibilitySnapshot({
        applicationFormComplete: this.isApplicationFormComplete({
          nameOnCertificate: profileName,
          certificateMailingAddress:
            parsed.data.certificateMailingAddress === undefined
              ? application.certificateMailingAddress
              : this.cleanOptionalText(parsed.data.certificateMailingAddress),
          openErpChecks: nextOpenErpChecks,
          studentAttestationAcceptedAt: nextAttestationAcceptedAt,
        }),
        documentCount: application.documents.length,
        profileComplete: true,
        surveySubmitted: Boolean(application.surveyResponse?.submittedAt),
      }),
    );

    const updatedApplication = await this.prisma.graduationApplication.update({
      where: { id: application.id },
      data: updateData,
      include: this.studentApplicationInclude,
    });

    return this.serializeStudentApplication(updatedApplication);
  }

  async submitCurrentStudentApplication(user: AuthenticatedUser) {
    const profile = await this.getStudentProfile(user);
    const application = await this.findCurrentApplication(profile.id);

    if (!application) {
      throw new NotFoundException('Start a graduation application before submitting.');
    }

    if (!this.canStudentEditApplication(application.status)) {
      return this.serializeStudentApplication(application);
    }

    const registryDocumentRequest = this.readRegistryDocumentRequest(application.eligibility);

    if (application.status === ApplicationStatus.RETURNED_TO_STUDENT && registryDocumentRequest) {
      if (!this.isRegistryDocumentRequestSatisfied(application, registryDocumentRequest)) {
        throw new BadRequestException('Upload the documents requested by Registry before continuing.');
      }

      return this.returnRegistryDocumentsToIntake(user, application, registryDocumentRequest);
    }

    this.assertProfileReady(profile);
    this.assertApplicationReadyForSubmission(application);

    const submittedAt = application.submittedAt ?? new Date();
    const eligibility = this.createEligibilitySnapshot({
      applicationFormComplete: true,
      documentCount: application.documents.length,
      documentsComplete: true,
      finalSubmissionReady: true,
      profileComplete: true,
      surveySubmitted: true,
    });

    const [, , updatedApplication] = await this.prisma.$transaction([
      this.prisma.clearanceTask.upsert({
        where: {
          applicationId_stage: {
            applicationId: application.id,
            stage: ClearanceStage.BURSARY,
          },
        },
        update: {
          decision: ClearanceDecision.PENDING,
          remarks: null,
          decidedAt: null,
        },
        create: {
          applicationId: application.id,
          stage: ClearanceStage.BURSARY,
          decision: ClearanceDecision.PENDING,
        },
      }),

      this.prisma.auditLog.create({
        data: {
          applicationId: application.id,
          actorId: user.id,
          entityType: 'GraduationApplication',
          entityId: application.id,
          action: 'SUBMITTED',
          metadata: {
            nextStage: ClearanceStage.BURSARY,
            status: ApplicationStatus.BURSARY_PENDING,
          },
        },
      }),

      this.prisma.graduationApplication.update({
        where: { id: application.id },
        data: {
          status: ApplicationStatus.BURSARY_PENDING,
          submittedAt,
          eligibility,
        },
        include: this.studentApplicationInclude,
      }),
    ]);

    return this.serializeStudentApplication(updatedApplication);
  }

  async requestBursaryPayment(user: AuthenticatedUser, applicationId: string, input: unknown) {
    const parsed = bursaryPaymentRequestSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const application = await this.findApplicationForBursary(applicationId);

    if (
      application.status !== ApplicationStatus.BURSARY_PENDING &&
      application.status !== ApplicationStatus.BURSARY_NOT_CLEARED
    ) {
      throw new BadRequestException('Only applications currently with Bursary can receive a payment request.');
    }

    const requestedAt = new Date();
    const paymentRequest = {
      amount: parsed.data.amount,
      currency: parsed.data.currency.toUpperCase(),
      note: parsed.data.note,
      requestedAt: requestedAt.toISOString(),
      requestedById: user.id,
      receiptUploaded: false,
    };
    const eligibility = this.mergeEligibility(application.eligibility, {
      bursaryPaymentRequest: paymentRequest,
    });
    const remarks = this.formatBursaryPaymentRequest(paymentRequest);

    const [, , updatedApplication] = await this.prisma.$transaction([
      this.prisma.clearanceTask.upsert({
        where: {
          applicationId_stage: {
            applicationId,
            stage: ClearanceStage.BURSARY,
          },
        },
        update: {
          assignedToId: user.id,
          decision: ClearanceDecision.RETURNED,
          remarks,
          decidedAt: null,
        },
        create: {
          applicationId,
          assignedToId: user.id,
          stage: ClearanceStage.BURSARY,
          decision: ClearanceDecision.RETURNED,
          remarks,
        },
      }),

      this.prisma.auditLog.create({
        data: {
          applicationId,
          actorId: user.id,
          entityType: 'GraduationApplication',
          entityId: applicationId,
          action: 'BURSARY_PAYMENT_REQUESTED',
          metadata: paymentRequest,
        },
      }),

      this.prisma.graduationApplication.update({
        where: { id: applicationId },
        data: {
          status: ApplicationStatus.BURSARY_NOT_CLEARED,
          eligibility,
        },
        include: this.studentApplicationInclude,
      }),
    ]);

    const emailSent = await this.sendBursaryPaymentEmail(application, paymentRequest);

    return {
      application: this.serializeStudentApplication(updatedApplication),
      emailSent,
    };
  }

  async clearBursary(user: AuthenticatedUser, applicationId: string, input: unknown) {
    const parsed = bursaryClearanceSchema.safeParse(input ?? {});

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const application = await this.findApplicationForBursary(applicationId);

    if (
      application.status !== ApplicationStatus.BURSARY_PENDING &&
      application.status !== ApplicationStatus.BURSARY_NOT_CLEARED
    ) {
      throw new BadRequestException('Only applications currently with Bursary can be cleared by Bursary.');
    }

    if (application.status === ApplicationStatus.BURSARY_NOT_CLEARED && !this.findBursaryReceipt(application.documents)) {
      throw new BadRequestException('A payment receipt must be uploaded before clearing this Bursary request.');
    }

    const remarks = parsed.data.remarks;
    const eligibility = this.mergeEligibility(application.eligibility, {
      bursaryFinanciallyCleared: parsed.data.financiallyCleared,
      bursaryClearedAt: new Date().toISOString(),
      bursaryClearedById: user.id,
    });

    const decidedAt = new Date();
    const [, , , updatedApplication] = await this.prisma.$transaction([
      this.prisma.clearanceTask.upsert({
        where: {
          applicationId_stage: {
            applicationId,
            stage: ClearanceStage.BURSARY,
          },
        },
        update: {
          assignedToId: user.id,
          decision: ClearanceDecision.CLEARED,
          remarks,
          decidedAt,
        },
        create: {
          applicationId,
          assignedToId: user.id,
          stage: ClearanceStage.BURSARY,
          decision: ClearanceDecision.CLEARED,
          remarks,
          decidedAt,
        },
      }),

      this.prisma.clearanceTask.upsert({
        where: {
          applicationId_stage: {
            applicationId,
            stage: ClearanceStage.REGISTRY_INTAKE,
          },
        },
        update: {
          decision: ClearanceDecision.PENDING,
          remarks: null,
          decidedAt: null,
        },
        create: {
          applicationId,
          stage: ClearanceStage.REGISTRY_INTAKE,
          decision: ClearanceDecision.PENDING,
        },
      }),

      this.prisma.auditLog.create({
        data: {
          applicationId,
          actorId: user.id,
          entityType: 'GraduationApplication',
          entityId: applicationId,
          action: 'BURSARY_CLEARED',
          metadata: {
            nextStage: ClearanceStage.REGISTRY_INTAKE,
            status: ApplicationStatus.REGISTRY_INTAKE_REVIEW,
          },
        },
      }),

      this.prisma.graduationApplication.update({
        where: { id: applicationId },
        data: {
          status: ApplicationStatus.REGISTRY_INTAKE_REVIEW,
          eligibility,
        },
        include: this.studentApplicationInclude,
      }),
    ]);

    return this.serializeStudentApplication(updatedApplication);
  }

  async clearRegistryIntake(user: AuthenticatedUser, applicationId: string, input: unknown) {
    const parsed = registryIntakeClearanceSchema.safeParse(input ?? {});

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const application = await this.findApplicationForBursary(applicationId);

    if (application.status !== ApplicationStatus.REGISTRY_INTAKE_REVIEW) {
      throw new BadRequestException('Only applications currently with Registry intake can be cleared by Registry.');
    }

    const decidedAt = new Date();
    const registryChecklist = {
      ...parsed.data,
      remarks: this.cleanOptionalText(parsed.data.remarks),
      clearedAt: decidedAt.toISOString(),
      clearedById: user.id,
    };
    const remarks = this.formatRegistryIntakeChecklist(parsed.data);
    const eligibility = this.mergeEligibility(application.eligibility, {
      registryIntakeChecklist: registryChecklist,
      registryIntakeClearedAt: decidedAt.toISOString(),
      registryIntakeClearedById: user.id,
    });

    const [, , , updatedApplication] = await this.prisma.$transaction([
      this.prisma.clearanceTask.upsert({
        where: {
          applicationId_stage: {
            applicationId,
            stage: ClearanceStage.REGISTRY_INTAKE,
          },
        },
        update: {
          assignedToId: user.id,
          decision: ClearanceDecision.CLEARED,
          remarks,
          decidedAt,
        },
        create: {
          applicationId,
          assignedToId: user.id,
          stage: ClearanceStage.REGISTRY_INTAKE,
          decision: ClearanceDecision.CLEARED,
          remarks,
          decidedAt,
        },
      }),

      this.prisma.clearanceTask.upsert({
        where: {
          applicationId_stage: {
            applicationId,
            stage: ClearanceStage.PROGRAM_CHAIR,
          },
        },
        update: {
          decision: ClearanceDecision.PENDING,
          remarks: null,
          decidedAt: null,
        },
        create: {
          applicationId,
          stage: ClearanceStage.PROGRAM_CHAIR,
          decision: ClearanceDecision.PENDING,
        },
      }),

      this.prisma.auditLog.create({
        data: {
          applicationId,
          actorId: user.id,
          entityType: 'GraduationApplication',
          entityId: applicationId,
          action: 'REGISTRY_INTAKE_CLEARED',
          metadata: {
            checklist: registryChecklist,
            nextStage: ClearanceStage.PROGRAM_CHAIR,
            status: ApplicationStatus.CHAIR_REVIEW,
          },
        },
      }),

      this.prisma.graduationApplication.update({
        where: { id: applicationId },
        data: {
          status: ApplicationStatus.CHAIR_REVIEW,
          eligibility,
        },
        include: this.studentApplicationInclude,
      }),
    ]);

    return this.serializeStudentApplication(updatedApplication);
  }

  async requestRegistryIntakeDocuments(user: AuthenticatedUser, applicationId: string, input: unknown) {
    const parsed = registryIntakeDocumentRequestSchema.safeParse(input ?? {});

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const application = await this.findApplicationForBursary(applicationId);

    if (application.status !== ApplicationStatus.REGISTRY_INTAKE_REVIEW) {
      throw new BadRequestException('Only applications currently with Registry intake can receive document requests.');
    }

    const requiredDocumentTypes = registryIntakeDocumentRequirements
      .filter((item) => !parsed.data[item.key])
      .map((item) => item.type);

    if (requiredDocumentTypes.length === 0) {
      throw new BadRequestException('Untick at least one document-backed item before requesting complete documents.');
    }

    const missingChecks = registryIntakeDocumentRequestChecks
      .filter((item) => !parsed.data[item.key])
      .map((item) => item.label);
    const requestedAt = new Date();
    const registryDocumentRequest: RegistryDocumentRequest = {
      checklist: parsed.data,
      completed: false,
      completedAt: null,
      missingChecks,
      remarks: parsed.data.remarks,
      requestedAt: requestedAt.toISOString(),
      requestedById: user.id,
      requiredDocumentTypes,
    };
    const remarks = this.formatRegistryDocumentRequest(registryDocumentRequest);
    const eligibility = this.mergeEligibility(application.eligibility, {
      registryDocumentRequest,
    });

    const [, , updatedApplication] = await this.prisma.$transaction([
      this.prisma.clearanceTask.upsert({
        where: {
          applicationId_stage: {
            applicationId,
            stage: ClearanceStage.REGISTRY_INTAKE,
          },
        },
        update: {
          assignedToId: user.id,
          decision: ClearanceDecision.RETURNED,
          remarks,
          decidedAt: null,
        },
        create: {
          applicationId,
          assignedToId: user.id,
          stage: ClearanceStage.REGISTRY_INTAKE,
          decision: ClearanceDecision.RETURNED,
          remarks,
        },
      }),

      this.prisma.auditLog.create({
        data: {
          applicationId,
          actorId: user.id,
          entityType: 'GraduationApplication',
          entityId: applicationId,
          action: 'REGISTRY_DOCUMENTS_REQUESTED',
          metadata: registryDocumentRequest,
        },
      }),

      this.prisma.graduationApplication.update({
        where: { id: applicationId },
        data: {
          status: ApplicationStatus.RETURNED_TO_STUDENT,
          eligibility,
        },
        include: this.studentApplicationInclude,
      }),
    ]);

    return this.serializeStudentApplication(updatedApplication);
  }

  decideProgramChair(user: AuthenticatedUser, applicationId: string, input: unknown) {
    return this.decideAcademicClearance(user, applicationId, input, {
      actionCleared: 'PROGRAM_CHAIR_CLEARED',
      actionNotCleared: 'PROGRAM_CHAIR_NOT_CLEARED',
      eligibilityPrefix: 'programChair',
      expectedStatus: ApplicationStatus.CHAIR_REVIEW,
      nextStage: ClearanceStage.DEAN,
      nextStatus: ApplicationStatus.DEAN_REVIEW,
      notClearedStatus: ApplicationStatus.CHAIR_NOT_CLEARED,
      stage: ClearanceStage.PROGRAM_CHAIR,
      stageLabel: 'Program Chair',
    });
  }

  decideDean(user: AuthenticatedUser, applicationId: string, input: unknown) {
    return this.decideAcademicClearance(user, applicationId, input, {
      actionCleared: 'DEAN_CLEARED',
      actionNotCleared: 'DEAN_NOT_CLEARED',
      eligibilityPrefix: 'dean',
      expectedStatus: ApplicationStatus.DEAN_REVIEW,
      nextStage: ClearanceStage.FINAL_REGISTRY,
      nextStatus: ApplicationStatus.FINAL_REGISTRY_REVIEW,
      notClearedStatus: ApplicationStatus.DEAN_NOT_CLEARED,
      stage: ClearanceStage.DEAN,
      stageLabel: 'Dean',
    });
  }

  decideFinalRegistry(user: AuthenticatedUser, applicationId: string, input: unknown) {
    return this.clearFinalRegistry(user, applicationId, input);
  }

  async clearFinalRegistry(user: AuthenticatedUser, applicationId: string, input: unknown) {
    const parsed = finalRegistryClearanceSchema.safeParse(input ?? {});

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const application = await this.findApplicationForBursary(applicationId);

    if (application.status !== ApplicationStatus.FINAL_REGISTRY_REVIEW) {
      throw new BadRequestException('Only applications currently with Final Registry can be cleared by Registry.');
    }

    const decidedAt = new Date();
    const comments = this.cleanOptionalText(parsed.data.comments);
    const registryFinalReview = {
      completionTerm: parsed.data.completionTerm,
      finalGpa: parsed.data.finalGpa,
      degreeHonors: parsed.data.degreeHonors,
      comments,
      clearedAt: decidedAt.toISOString(),
      clearedById: user.id,
    };
    const remarks = this.formatFinalRegistryReview(registryFinalReview);
    const eligibility = this.mergeEligibility(application.eligibility, {
      finalRegistryReview: registryFinalReview,
      finalRegistryClearedAt: decidedAt.toISOString(),
      finalRegistryClearedById: user.id,
    });

    const [, , , updatedApplication] = await this.prisma.$transaction([
      this.prisma.clearanceTask.upsert({
        where: {
          applicationId_stage: {
            applicationId,
            stage: ClearanceStage.FINAL_REGISTRY,
          },
        },
        update: {
          assignedToId: user.id,
          decision: ClearanceDecision.CLEARED,
          remarks,
          decidedAt,
        },
        create: {
          applicationId,
          assignedToId: user.id,
          stage: ClearanceStage.FINAL_REGISTRY,
          decision: ClearanceDecision.CLEARED,
          remarks,
          decidedAt,
        },
      }),

      this.prisma.clearanceTask.upsert({
        where: {
          applicationId_stage: {
            applicationId,
            stage: ClearanceStage.PROVOST,
          },
        },
        update: {
          decision: ClearanceDecision.PENDING,
          remarks: null,
          decidedAt: null,
        },
        create: {
          applicationId,
          stage: ClearanceStage.PROVOST,
          decision: ClearanceDecision.PENDING,
        },
      }),

      this.prisma.auditLog.create({
        data: {
          applicationId,
          actorId: user.id,
          entityType: 'GraduationApplication',
          entityId: applicationId,
          action: 'FINAL_REGISTRY_CLEARED',
          metadata: {
            finalRegistryReview: registryFinalReview,
            nextStage: ClearanceStage.PROVOST,
            status: ApplicationStatus.PROVOST_REVIEW,
          },
        },
      }),

      this.prisma.graduationApplication.update({
        where: { id: applicationId },
        data: {
          status: ApplicationStatus.PROVOST_REVIEW,
          completionTerm: parsed.data.completionTerm,
          finalGpa: parsed.data.finalGpa,
          degreeHonors: parsed.data.degreeHonors,
          eligibility,
        },
        include: this.studentApplicationInclude,
      }),
    ]);

    return this.serializeStudentApplication(updatedApplication);
  }

  async signOffProvost(user: AuthenticatedUser, applicationId: string) {
    const application = await this.findApplicationForBursary(applicationId);

    if (application.status !== ApplicationStatus.PROVOST_REVIEW) {
      throw new BadRequestException('Only applications currently with Provost can be signed off by Provost.');
    }

    const decidedAt = new Date();
    const remarks = 'Provost final signoff completed.';
    const eligibility = this.mergeEligibility(application.eligibility, {
      provostDecision: 'SIGNED_OFF',
      provostSignedOffAt: decidedAt.toISOString(),
      provostSignedOffById: user.id,
    });

    const [, , updatedApplication] = await this.prisma.$transaction([
      this.prisma.clearanceTask.upsert({
        where: {
          applicationId_stage: {
            applicationId,
            stage: ClearanceStage.PROVOST,
          },
        },
        update: {
          assignedToId: user.id,
          decision: ClearanceDecision.CLEARED,
          remarks,
          decidedAt,
        },
        create: {
          applicationId,
          assignedToId: user.id,
          stage: ClearanceStage.PROVOST,
          decision: ClearanceDecision.CLEARED,
          remarks,
          decidedAt,
        },
      }),

      this.prisma.auditLog.create({
        data: {
          applicationId,
          actorId: user.id,
          entityType: 'GraduationApplication',
          entityId: applicationId,
          action: 'PROVOST_SIGNED_OFF',
          metadata: {
            status: ApplicationStatus.COMPLETED,
          },
        },
      }),

      this.prisma.graduationApplication.update({
        where: { id: applicationId },
        data: {
          status: ApplicationStatus.COMPLETED,
          eligibility,
        },
        include: this.studentApplicationInclude,
      }),
    ]);

    const emailSent = await this.sendApplicationSuccessEmail(application);

    return {
      application: this.serializeStudentApplication(updatedApplication),
      emailSent,
    };
  }

  private async decideAcademicClearance(
    user: AuthenticatedUser,
    applicationId: string,
    input: unknown,
    config: {
      actionCleared: string;
      actionNotCleared: string;
      eligibilityPrefix: 'programChair' | 'dean';
      expectedStatus: ApplicationStatus;
      nextStage: ClearanceStage;
      nextStatus: ApplicationStatus;
      notClearedStatus: ApplicationStatus;
      stage: ClearanceStage;
      stageLabel: string;
    },
  ) {
    const parsed = staffClearanceDecisionSchema.safeParse(input ?? {});

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const application = await this.findApplicationForBursary(applicationId);

    if (application.status !== config.expectedStatus) {
      throw new BadRequestException(`Only applications currently with ${config.stageLabel} can be reviewed by ${config.stageLabel}.`);
    }

    const decidedAt = new Date();
    const isCleared = parsed.data.decision === 'CLEARED';
    const decision = isCleared ? ClearanceDecision.CLEARED : ClearanceDecision.NOT_CLEARED;
    const status = isCleared ? config.nextStatus : config.notClearedStatus;
    const action = isCleared ? config.actionCleared : config.actionNotCleared;
    const eligibility = this.mergeEligibility(application.eligibility, {
      [`${config.eligibilityPrefix}Decision`]: parsed.data.decision,
      [`${config.eligibilityPrefix}Comments`]: parsed.data.comments,
      [`${config.eligibilityPrefix}DecidedAt`]: decidedAt.toISOString(),
      [`${config.eligibilityPrefix}DecidedById`]: user.id,
    });

    const currentTask = this.prisma.clearanceTask.upsert({
      where: {
        applicationId_stage: {
          applicationId,
          stage: config.stage,
        },
      },
      update: {
        assignedToId: user.id,
        decision,
        remarks: parsed.data.comments,
        decidedAt,
      },
      create: {
        applicationId,
        assignedToId: user.id,
        stage: config.stage,
        decision,
        remarks: parsed.data.comments,
        decidedAt,
      },
    });

    const auditLog = this.prisma.auditLog.create({
      data: {
        applicationId,
        actorId: user.id,
        entityType: 'GraduationApplication',
        entityId: applicationId,
        action,
        metadata: {
          comments: parsed.data.comments,
          decision: parsed.data.decision,
          nextStage: isCleared ? config.nextStage : null,
          status,
        },
      },
    });

    const updateApplication = this.prisma.graduationApplication.update({
      where: { id: applicationId },
      data: {
        status,
        eligibility,
      },
      include: this.studentApplicationInclude,
    });

    const operations = isCleared
      ? [
          currentTask,
          this.prisma.clearanceTask.upsert({
            where: {
              applicationId_stage: {
                applicationId,
                stage: config.nextStage,
              },
            },
            update: {
              decision: ClearanceDecision.PENDING,
              remarks: null,
              decidedAt: null,
            },
            create: {
              applicationId,
              stage: config.nextStage,
              decision: ClearanceDecision.PENDING,
            },
          }),
          auditLog,
          updateApplication,
        ]
      : [currentTask, auditLog, updateApplication];
    const results = await this.prisma.$transaction(operations);
    const updatedApplication = results[results.length - 1] as StudentApplication;

    return this.serializeStudentApplication(updatedApplication);
  }

  async createStaffDocumentDownload(user: AuthenticatedUser, applicationId: string, documentId: string) {
    if (user.role === RoleName.STUDENT) {
      throw new BadRequestException('Only staff accounts can open application documents from this endpoint.');
    }

    const document = await this.prisma.documentUpload.findFirst({
      where: {
        id: documentId,
        applicationId,
      },
    });

    if (!document) {
      throw new NotFoundException('Document was not found for this application.');
    }

    return this.storageService.createPresignedDownload({
      bucket: document.bucket,
      key: document.storageKey,
    });
  }

  private async returnRegistryDocumentsToIntake(
    user: AuthenticatedUser,
    application: StudentApplication,
    request: RegistryDocumentRequest,
  ) {
    const completedAt = new Date();
    const completedRequest = {
      ...request,
      completed: true,
      completedAt: completedAt.toISOString(),
    };
    const eligibility = this.mergeEligibility(application.eligibility, {
      registryDocumentRequest: completedRequest,
    });
    const [, , updatedApplication] = await this.prisma.$transaction([
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
          eligibility,
        },
        include: this.studentApplicationInclude,
      }),
    ]);

    return this.serializeStudentApplication(updatedApplication);
  }

  private async findApplicationForBursary(applicationId: string) {
    const application = await this.prisma.graduationApplication.findUnique({
      where: { id: applicationId },
      include: {
        term: true,
        documents: {
          orderBy: { createdAt: 'desc' },
        },
        clearanceTasks: true,
        studentProfile: {
          include: {
            program: true,
            user: true,
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundException('Graduation application was not found.');
    }

    return application;
  }

  private mergeEligibility(current: Prisma.JsonValue | null, patch: Prisma.InputJsonObject) {
    const currentObject = current && typeof current === 'object' && !Array.isArray(current) ? current : {};

    return {
      ...(currentObject as Prisma.JsonObject),
      ...patch,
    };
  }

  private formatBursaryPaymentRequest(request: BursaryPaymentRequest) {
    return [
      `Outstanding balance: ${request.currency} ${request.amount.toLocaleString('en-US')}`,
      request.note,
    ].join('\n\n');
  }

  private formatRegistryIntakeChecklist(checklist: RegistryIntakeChecklist) {
    const items = [
      ['Satisfied all graduation requirements', checklist.graduationRequirementsSatisfied],
      ['JAMB admission letter attached', checklist.jambAdmissionLetterAttached],
      ['JAMB result slip attached', checklist.jambResultSlipAttached],
      ['Graduation survey completed and attached', checklist.graduationSurveyCompleted],
      ['NIN slip attached', checklist.ninSlipAttached],
      ['Credit audit attached', checklist.creditAuditAttached],
      ['Unofficial transcript attached', checklist.unofficialTranscriptAttached],
    ];
    const summary = items.map(([label, checked]) => `${label}: ${checked ? 'Yes' : 'No'}`).join('\n');
    const remarks = this.cleanOptionalText(checklist.remarks);

    return remarks ? `${summary}\n\nRemarks: ${remarks}` : summary;
  }

  private formatRegistryDocumentRequest(request: RegistryDocumentRequest) {
    return [
      request.missingChecks.length > 0 ? `Missing or incorrect items:\n${request.missingChecks.join('\n')}` : null,
      request.requiredDocumentTypes.length > 0 ? `Documents requested:\n${request.requiredDocumentTypes.join('\n')}` : null,
      `Remarks: ${request.remarks}`,
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  private formatFinalRegistryReview(review: {
    completionTerm: string;
    finalGpa: number;
    degreeHonors: string;
    comments: string | null;
  }) {
    const summary = [
      `Degree requirement completed in: ${review.completionTerm}`,
      `Final GPA: ${review.finalGpa.toFixed(2)}`,
      `Class of Degree/Degree Honors: ${review.degreeHonors}`,
    ].join('\n');

    return review.comments ? `${summary}\n\nComments: ${review.comments}` : summary;
  }

  private async sendBursaryPaymentEmail(application: BursaryApplication, request: BursaryPaymentRequest) {
    const studentName = this.getProfileName(application.studentProfile);
    const amount = `${request.currency} ${request.amount.toLocaleString('en-US')}`;

    try {
      await this.mailService.sendMail({
        to: application.studentProfile.user.email,
        subject: 'Bursary payment required for your graduation clearance',
        text: [
          `Hello ${application.studentProfile.firstName},`,
          '',
          `Bursary reviewed your graduation clearance application and found an outstanding balance of ${amount}.`,
          '',
          request.note,
          '',
          'Please pay the outstanding amount and upload your payment receipt in the graduation clearance system so Bursary can continue the review.',
          '',
          `Student: ${studentName}`,
          `AUN Student ID: ${application.studentProfile.studentId}`,
        ].join('\n'),
        html: `
          <p>Hello ${application.studentProfile.firstName},</p>
          <p>Bursary reviewed your graduation clearance application and found an outstanding balance of <strong>${amount}</strong>.</p>
          <p>${this.escapeHtml(request.note)}</p>
          <p>Please pay the outstanding amount and upload your payment receipt in the graduation clearance system so Bursary can continue the review.</p>
          <p><strong>Student:</strong> ${this.escapeHtml(studentName)}<br />
          <strong>AUN Student ID:</strong> ${this.escapeHtml(application.studentProfile.studentId)}</p>
        `,
      });

      return true;
    } catch {
      return false;
    }
  }

  private async sendApplicationSuccessEmail(application: BursaryApplication) {
    const studentName = this.getProfileName(application.studentProfile);

    try {
      await this.mailService.sendMail({
        to: application.studentProfile.user.email,
        subject: 'Your graduation clearance application has been approved',
        text: [
          `Hello ${application.studentProfile.firstName},`,
          '',
          'Your SITC graduation clearance application has been successfully approved.',
          '',
          'You have completed the clearance workflow for graduation.',
          '',
          `Student: ${studentName}`,
          `AUN Student ID: ${application.studentProfile.studentId}`,
        ].join('\n'),
        html: `
          <p>Hello ${application.studentProfile.firstName},</p>
          <p>Your SITC graduation clearance application has been successfully approved.</p>
          <p>You have completed the clearance workflow for graduation.</p>
          <p><strong>Student:</strong> ${this.escapeHtml(studentName)}<br />
          <strong>AUN Student ID:</strong> ${this.escapeHtml(application.studentProfile.studentId)}</p>
        `,
      });

      return true;
    } catch {
      return false;
    }
  }

  private get studentApplicationInclude() {
    return {
      auditLogs: {
        orderBy: { createdAt: 'asc' },
        include: {
          actor: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
            },
          },
        },
      },
      term: true,
      documents: true,
      clearanceTasks: true,
      surveyResponse: true,
      studentProfile: {
        include: {
          program: true,
        },
      },
    } satisfies Prisma.GraduationApplicationInclude;
  }

  private async getStudentProfile(user: AuthenticatedUser) {
    if (user.role !== RoleName.STUDENT) {
      throw new BadRequestException('Only student accounts can manage graduation applications.');
    }

    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId: user.id },
      include: { program: true },
    });

    if (!profile) {
      throw new NotFoundException('Student profile was not found for this account.');
    }

    return profile;
  }

  private async findCurrentApplication(studentProfileId: string, termId?: string) {
    return this.prisma.graduationApplication.findFirst({
      where: {
        studentProfileId,
        ...(termId ? { termId } : {}),
        status: {
          notIn: [ApplicationStatus.WITHDRAWN],
        },
      },
      orderBy: { updatedAt: 'desc' },
      include: this.studentApplicationInclude,
    });
  }

  private assertProfileReady(profile: Awaited<ReturnType<ApplicationsService['getStudentProfile']>>) {
    const missingFields = [
      [profile.major, 'major'],
      [profile.catalogYearLabel, 'catalog year'],
      [profile.expectedGraduationTerm, 'graduation term'],
      [profile.currentGpa, 'current GPA'],
      [profile.phone, 'phone number'],
      [profile.shippingAddress, 'mailing address'],
    ].flatMap(([value, label]) => (value ? [] : [label]));

    if (missingFields.length > 0) {
      throw new BadRequestException(`Complete your profile before starting: ${missingFields.join(', ')}.`);
    }
  }

  private serializeStudentApplication(application: StudentApplication) {
    const profileName = this.getProfileName(application.studentProfile);
    const openErpChecks = this.normalizeOpenErpChecks(application.openErpChecks);
    const bursaryReceipt = this.findBursaryReceipt(application.documents);
    const bursaryPaymentRequest = this.readBursaryPaymentRequest(application.eligibility);
    const registryDocumentRequest = this.readRegistryDocumentRequest(application.eligibility);
    const formComplete = Boolean(
      profileName &&
        application.certificateMailingAddress?.trim() &&
        this.isOpenErpChecksComplete(openErpChecks) &&
        application.studentAttestationAcceptedAt,
    );

    return {
      id: application.id,
      status: application.status,
      term: application.term.name,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
      submittedAt: application.submittedAt,
      nameOnCertificate: application.nameOnCertificate ?? profileName,
      certificateMailingAddress: application.certificateMailingAddress,
      openErpChecks,
      studentRemarks: application.studentRemarks,
      studentAttestationAcceptedAt: application.studentAttestationAcceptedAt,
      formComplete,
      documentCount: application.documents.length,
      surveySubmitted: Boolean(application.surveyResponse?.submittedAt),
      bursaryPaymentRequest,
      bursaryReceipt: bursaryReceipt ? this.serializeStudentDocument(bursaryReceipt) : null,
      registryDocumentRequest,
      workflowLog: this.serializeWorkflowLog(application.auditLogs ?? []),
      profile: {
        studentId: application.studentProfile.studentId,
        name: profileName,
        major: application.studentProfile.major ?? application.studentProfile.program?.name ?? null,
        majorCode: application.studentProfile.programTrack,
        catalogYear: application.studentProfile.catalogYearLabel,
        currentGpa:
          application.studentProfile.currentGpa === null
            ? null
            : Number(application.studentProfile.currentGpa),
      },
    };
  }

  private serializeWorkflowLog(logs: StudentApplication['auditLogs']) {
    return logs.map((log) => ({
      id: log.id,
      action: log.action,
      actor: log.actor
        ? {
            email: log.actor.email,
            id: log.actor.id,
            name: log.actor.name,
            role: log.actor.role,
          }
        : null,
      createdAt: log.createdAt,
      metadata: log.metadata,
    }));
  }

  private serializeStudentDocument(document: StudentApplication['documents'][number]) {
    return {
      id: document.id,
      type: document.type,
      originalName: document.originalName,
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes,
      verifiedAt: document.verifiedAt,
      createdAt: document.createdAt,
    };
  }

  private cleanOptionalText(value: string | null | undefined) {
    return value?.trim() ? value.trim() : null;
  }

  private normalizeOpenErpChecks(value: unknown): OpenErpAccuracyChecks {
    const record = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

    return {
      concentrationDeclared: this.readYesNo(record.concentrationDeclared),
      majorAccurate: this.readYesNo(record.majorAccurate),
      concentrationAccurate: this.readYesNo(record.concentrationAccurate),
      minorAccurate: this.readYesNo(record.minorAccurate),
      fullNameAccurate: this.readYesNo(record.fullNameAccurate),
      dateOfBirthAccurate: this.readYesNo(record.dateOfBirthAccurate),
      genderAccurate: this.readYesNo(record.genderAccurate),
      stateOfOriginAccurate: this.readYesNo(record.stateOfOriginAccurate),
      catalogYearAccurate: this.readYesNo(record.catalogYearAccurate),
    };
  }

  private readBursaryPaymentRequest(value: unknown) {
    const eligibility = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
    const request =
      eligibility.bursaryPaymentRequest &&
      typeof eligibility.bursaryPaymentRequest === 'object' &&
      !Array.isArray(eligibility.bursaryPaymentRequest)
        ? (eligibility.bursaryPaymentRequest as Record<string, unknown>)
        : null;

    if (!request) {
      return null;
    }

    return {
      amount: typeof request.amount === 'number' ? request.amount : null,
      currency: typeof request.currency === 'string' ? request.currency : 'NGN',
      note: typeof request.note === 'string' ? request.note : '',
      requestedAt: typeof request.requestedAt === 'string' ? request.requestedAt : null,
      receiptUploaded: request.receiptUploaded === true,
      receiptUploadedAt: typeof request.receiptUploadedAt === 'string' ? request.receiptUploadedAt : null,
    };
  }

  private readRegistryDocumentRequest(value: unknown): RegistryDocumentRequest | null {
    const eligibility = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
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
    const missingChecks = Array.isArray(request.missingChecks)
      ? request.missingChecks.filter((value): value is string => typeof value === 'string')
      : [];

    if (requiredDocumentTypes.length === 0) {
      return null;
    }

    return {
      checklist: toPlainRecord(request.checklist) as RegistryIntakeDocumentRequestInput,
      completed: request.completed === true,
      completedAt: typeof request.completedAt === 'string' ? request.completedAt : null,
      missingChecks,
      remarks: typeof request.remarks === 'string' ? request.remarks : '',
      requestedAt: typeof request.requestedAt === 'string' ? request.requestedAt : '',
      requestedById: typeof request.requestedById === 'string' ? request.requestedById : '',
      requiredDocumentTypes,
    };
  }

  private isRegistryDocumentRequestSatisfied(
    application: Pick<StudentApplication, 'documents'>,
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

  private isDocumentType(value: unknown): value is DocumentType {
    return typeof value === 'string' && Object.values(DocumentType).includes(value as DocumentType);
  }

  private findBursaryReceipt<T extends { verification: Prisma.JsonValue | null }>(documents: T[]) {
    return documents.find((document) => {
      const verification =
        document.verification && typeof document.verification === 'object' && !Array.isArray(document.verification)
          ? (document.verification as Record<string, unknown>)
          : {};

      return verification.purpose === bursaryReceiptPurpose;
    }) ?? null;
  }

  private readYesNo(value: unknown) {
    return value === 'YES' || value === 'NO' ? value : null;
  }

  private isOpenErpChecksComplete(value: OpenErpAccuracyChecks) {
    return openErpAccuracyKeys.every((key) => Boolean(value[key]));
  }

  private canStudentEditApplication(status: ApplicationStatus) {
    return status === ApplicationStatus.DRAFT || status === ApplicationStatus.RETURNED_TO_STUDENT;
  }

  private assertApplicationReadyForSubmission(application: StudentApplication) {
    const profileName = this.getProfileName(application.studentProfile);
    const openErpChecks = this.normalizeOpenErpChecks(application.openErpChecks);
    const formComplete = this.isApplicationFormComplete({
      nameOnCertificate: application.nameOnCertificate ?? profileName,
      certificateMailingAddress: application.certificateMailingAddress,
      openErpChecks,
      studentAttestationAcceptedAt: application.studentAttestationAcceptedAt,
    });
    const uploadedTypes = new Set(application.documents.map((document) => document.type));
    const missingDocuments = requiredDocumentTypes.filter((documentType) => !uploadedTypes.has(documentType));

    const missingSections = [
      formComplete ? null : 'graduation application',
      missingDocuments.length === 0 ? null : `documents (${missingDocuments.join(', ')})`,
      application.surveyResponse?.submittedAt ? null : 'senior survey',
    ].filter(Boolean);

    if (missingSections.length > 0) {
      throw new BadRequestException(`Complete these sections before final submission: ${missingSections.join(', ')}.`);
    }
  }

  private getProfileName(profile: { firstName: string; middleName: string | null; lastName: string }) {
    return [profile.firstName, profile.middleName, profile.lastName].filter(Boolean).join(' ');
  }

  private escapeHtml(value: string) {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  private createEligibilitySnapshot({
    applicationFormComplete,
    documentCount,
    documentsComplete = false,
    finalSubmissionReady = false,
    profileComplete,
    surveySubmitted,
  }: {
    applicationFormComplete: boolean;
    documentCount: number;
    documentsComplete?: boolean;
    finalSubmissionReady?: boolean;
    profileComplete: boolean;
    surveySubmitted: boolean;
  }) {
    return {
      status: finalSubmissionReady
        ? 'SUBMITTED_FOR_REVIEW'
        : applicationFormComplete
          ? 'DRAFT_READY'
          : 'DRAFT_IN_PROGRESS',
      profileComplete,
      applicationFormComplete,
      documentCount,
      documentsComplete,
      surveySubmitted,
      finalSubmissionReady,
    } satisfies Prisma.InputJsonObject;
  }

  private isApplicationFormComplete({
    certificateMailingAddress,
    nameOnCertificate,
    openErpChecks,
    studentAttestationAcceptedAt,
  }: {
    certificateMailingAddress: string | null;
    nameOnCertificate: string | null;
    openErpChecks: OpenErpAccuracyChecks;
    studentAttestationAcceptedAt: Date | null;
  }) {
    return Boolean(
      nameOnCertificate?.trim() &&
        certificateMailingAddress?.trim() &&
        this.isOpenErpChecksComplete(openErpChecks) &&
        studentAttestationAcceptedAt,
    );
  }
}
