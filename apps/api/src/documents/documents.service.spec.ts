import { BadRequestException } from '@nestjs/common';
import { ApplicationStatus, DocumentType, RoleName } from '@prisma/client';
import { describe, expect, it, jest } from '@jest/globals';
import { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { DocumentsService } from './documents.service';

type CreatePresignedUpload = StorageService['createPresignedUpload'];

type MockPrisma = {
  studentProfile: {
    findUnique: jest.Mock<(args: unknown) => Promise<unknown>>;
  };
  graduationApplication: {
    findFirst: jest.Mock<(args: unknown) => Promise<unknown>>;
    update: jest.Mock<(args: unknown) => Promise<unknown>>;
  };
  documentUpload: {
    create: jest.Mock<(args: unknown) => Promise<unknown>>;
  };
};

const studentUser: AuthenticatedUser = {
  id: 'user-1',
  email: 'ada@aun.edu.ng',
  role: RoleName.STUDENT,
  studentProfileId: 'profile-1',
  emailVerified: true,
};

const completeOpenErpChecks = {
  concentrationDeclared: 'YES',
  majorAccurate: 'YES',
  concentrationAccurate: 'YES',
  minorAccurate: 'YES',
  fullNameAccurate: 'YES',
  dateOfBirthAccurate: 'YES',
  genderAccurate: 'YES',
  stateOfOriginAccurate: 'YES',
  catalogYearAccurate: 'YES',
};

function createApplication(overrides: Record<string, unknown> = {}) {
  return {
    id: 'application-1',
    studentProfileId: 'profile-1',
    termId: 'term-1',
    status: ApplicationStatus.DRAFT,
    submittedAt: null,
    nameOnCertificate: 'Ada Lovelace',
    certificateMailingAddress: 'AUN Campus',
    studentRemarks: null,
    studentAttestationAcceptedAt: new Date(),
    openErpChecks: completeOpenErpChecks,
    eligibility: null,
    finalGpa: 3.75,
    degreeHonors: null,
    completionTerm: 'Fall 2026',
    createdAt: new Date(),
    updatedAt: new Date(),
    documents: [],
    surveyResponse: null,
    ...overrides,
  };
}

function createService() {
  const createPresignedUpload = jest.fn<CreatePresignedUpload>(async () => ({
    bucket: 'aungtcs',
    key: 'graduation-applications/application-1/unofficial_transcript/file-id',
    uploadUrl: 'https://example.com/upload',
    expiresIn: 900,
  }));
  const storageService = {
    createPresignedUpload,
  } as unknown as StorageService;
  const prisma: MockPrisma = {
    studentProfile: {
      findUnique: jest.fn(async (_args: unknown) => ({ id: 'profile-1' })),
    },
    graduationApplication: {
      findFirst: jest.fn(async (_args: unknown) => createApplication()),
      update: jest.fn(async (_args: unknown) => createApplication()),
    },
    documentUpload: {
      create: jest.fn(async (_args: unknown) => ({ id: 'document-1' })),
    },
  };

  return {
    createPresignedUpload,
    prisma,
    service: new DocumentsService(storageService, prisma as unknown as PrismaService),
  };
}

describe(DocumentsService, () => {
  it('creates a presigned upload request for the current student application', async () => {
    const { createPresignedUpload, service } = createService();

    await expect(
      service.presignMyUpload(studentUser, {
        documentType: DocumentType.UNOFFICIAL_TRANSCRIPT,
        contentType: 'application/pdf',
      }),
    ).resolves.toMatchObject({
      bucket: 'aungtcs',
      expiresIn: 900,
    });

    expect(createPresignedUpload).toHaveBeenCalledWith({
      applicationId: 'application-1',
      documentType: 'unofficial_transcript',
      contentType: 'application/pdf',
    });
  });

  it('records a completed upload and refreshes document eligibility', async () => {
    const { prisma, service } = createService();
    const applicationWithUpload = createApplication({
      documents: [
        {
          id: 'document-1',
          applicationId: 'application-1',
          type: DocumentType.UNOFFICIAL_TRANSCRIPT,
          bucket: 'aungtcs',
          storageKey: 'graduation-applications/application-1/unofficial_transcript/file-id',
          originalName: 'transcript.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 5000,
          verifiedAt: null,
          verifiedById: null,
          verification: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });

    prisma.graduationApplication.findFirst
      .mockResolvedValueOnce(createApplication())
      .mockResolvedValueOnce(applicationWithUpload)
      .mockResolvedValueOnce(applicationWithUpload);

    await expect(
      service.completeMyUpload(studentUser, {
        documentType: DocumentType.UNOFFICIAL_TRANSCRIPT,
        bucket: 'aungtcs',
        key: 'graduation-applications/application-1/unofficial_transcript/file-id',
        originalName: 'transcript.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 5000,
      }),
    ).resolves.toMatchObject({
      documentCount: 1,
    });

    expect(prisma.documentUpload.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          applicationId: 'application-1',
          type: DocumentType.UNOFFICIAL_TRANSCRIPT,
        }),
      }),
    );
    expect(prisma.graduationApplication.update).toHaveBeenCalled();
  });

  it('rejects invalid presign payloads', async () => {
    const { createPresignedUpload, service } = createService();

    await expect(service.presignMyUpload(studentUser, { documentType: 'NOPE' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(createPresignedUpload).not.toHaveBeenCalled();
  });
});
