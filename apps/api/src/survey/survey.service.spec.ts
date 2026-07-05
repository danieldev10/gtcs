import { BadRequestException } from '@nestjs/common';
import { ApplicationStatus, DocumentType, RoleName } from '@prisma/client';
import { describe, expect, it, jest } from '@jest/globals';
import { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { SurveyService } from './survey.service';

type MockPrisma = {
  studentProfile: {
    findUnique: jest.Mock<(args: unknown) => Promise<unknown>>;
  };
  graduationApplication: {
    findFirst: jest.Mock<(args: unknown) => Promise<unknown>>;
    update: jest.Mock<(args: unknown) => Promise<unknown>>;
  };
  surveyResponse: {
    upsert: jest.Mock<(args: unknown) => Promise<unknown>>;
  };
};

const studentUser: AuthenticatedUser = {
  id: 'user-1',
  email: 'ada@aun.edu.ng',
  role: RoleName.STUDENT,
  studentProfileId: 'profile-1',
  emailVerified: true,
};

function createDocument(type: DocumentType) {
  return {
    id: `document-${type}`,
    applicationId: 'application-1',
    type,
    bucket: 'aungtcs',
    storageKey: `graduation-applications/application-1/${type.toLowerCase()}/file-id`,
    originalName: `${type}.pdf`,
    mimeType: 'application/pdf',
    sizeBytes: 5000,
    verifiedAt: null,
    verifiedById: null,
    verification: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function createApplication(overrides: Record<string, unknown> = {}) {
  return {
    id: 'application-1',
    studentProfileId: 'profile-1',
    termId: 'term-1',
    status: ApplicationStatus.DRAFT,
    submittedAt: null,
    documents: [
      createDocument(DocumentType.JAMB_ADMISSION_LETTER),
      createDocument(DocumentType.JAMB_RESULT_SLIP),
      createDocument(DocumentType.NIN_SLIP),
      createDocument(DocumentType.CREDIT_AUDIT_SHEET),
      createDocument(DocumentType.UNOFFICIAL_TRANSCRIPT),
    ],
    surveyResponse: null,
    ...overrides,
  };
}

function createService() {
  const prisma: MockPrisma = {
    studentProfile: {
      findUnique: jest.fn(async (_args: unknown) => ({ id: 'profile-1' })),
    },
    graduationApplication: {
      findFirst: jest.fn(async (_args: unknown) => createApplication()),
      update: jest.fn(async (_args: unknown) => createApplication()),
    },
    surveyResponse: {
      upsert: jest.fn(async (args: unknown) => ({
        id: 'survey-1',
        applicationId: 'application-1',
        answers: (args as { create: { answers: unknown } }).create.answers,
        submittedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    },
  };

  return {
    prisma,
    service: new SurveyService(prisma as unknown as PrismaService),
  };
}

describe(SurveyService, () => {
  it('submits survey answers after required documents are uploaded', async () => {
    const { prisma, service } = createService();

    await expect(
      service.saveMySurvey(studentUser, {
        submit: true,
        answers: {
          immediatePlan: 'NYSC',
          attendCommencement: 'YES',
          attendSeniorWeek: 'MAYBE',
          commencementTicketSuggestion: '6',
          awardsDinnerTicketSuggestion: '4',
          commencementInfoMethod: 'EMAIL',
          guestLodgingPreference: 'AUN_HOTEL',
          townTransportPlan: 'PERSONAL_CAR',
          photoAlbumOpinion: 'I_LOVE_IT',
          attendedCommencementBefore: 'NO',
          improvementSuggestions: 'Improve seating flow.',
          awardCategorySuggestions: 'Best capstone project',
          participatedPrograms: ['MODEL_UN', 'HULT_PRIZE'],
          commencementExpectations: 'A well organized ceremony.',
          myAunIs: 'Home and growth',
        },
      }),
    ).resolves.toMatchObject({
      applicationId: 'application-1',
      submittedAt: expect.any(Date),
    });

    expect(prisma.surveyResponse.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { applicationId: 'application-1' },
      }),
    );
    expect(prisma.graduationApplication.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eligibility: expect.objectContaining({
            surveySubmitted: true,
            finalSubmissionReady: true,
          }),
        }),
      }),
    );
  });

  it('blocks survey access until all required documents are uploaded', async () => {
    const { service, prisma } = createService();
    prisma.graduationApplication.findFirst.mockResolvedValueOnce(
      createApplication({
        documents: [createDocument(DocumentType.UNOFFICIAL_TRANSCRIPT)],
      }),
    );

    await expect(service.getMySurvey(studentUser)).rejects.toBeInstanceOf(BadRequestException);
  });
});
