import { BadRequestException } from '@nestjs/common';
import { ApplicationStatus, ClearanceDecision, ClearanceStage, DocumentType, RoleName } from '@prisma/client';
import { describe, expect, it, jest } from '@jest/globals';
import { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { ApplicationsService } from './applications.service';

type MockPrisma = {
  $transaction: jest.Mock<
    (input: ((tx: MockTransaction) => Promise<unknown>) | Array<Promise<unknown>>) => Promise<unknown>
  >;
  studentProfile: {
    findUnique: jest.Mock<(args: unknown) => Promise<unknown>>;
  };
  academicTerm: {
    upsert: jest.Mock<(args: unknown) => Promise<unknown>>;
  };
  graduationApplication: {
    findUnique: jest.Mock<(args: unknown) => Promise<unknown>>;
    findMany: jest.Mock<(args: unknown) => Promise<unknown[]>>;
    findFirst: jest.Mock<(args: unknown) => Promise<unknown>>;
    create: jest.Mock<(args: unknown) => Promise<unknown>>;
    update: jest.Mock<(args: unknown) => Promise<unknown>>;
  };
  user: {
    upsert: jest.Mock<(args: unknown) => Promise<unknown>>;
  };
  clearanceTask: {
    upsert: jest.Mock<(args: unknown) => Promise<unknown>>;
  };
  auditLog: {
    create: jest.Mock<(args: unknown) => Promise<unknown>>;
  };
};

type MockTransaction = Pick<MockPrisma, 'auditLog' | 'clearanceTask' | 'graduationApplication'>;

const studentUser: AuthenticatedUser = {
  id: 'user-1',
  email: 'ada@aun.edu.ng',
  role: RoleName.STUDENT,
  studentProfileId: 'profile-1',
  emailVerified: true,
};

const chairUser: AuthenticatedUser = {
  id: 'chair-1',
  email: 'chair@aun.edu.ng',
  role: RoleName.PROGRAM_CHAIR,
  emailVerified: true,
};

const deanUser: AuthenticatedUser = {
  id: 'dean-1',
  email: 'dean@aun.edu.ng',
  role: RoleName.DEAN,
  emailVerified: true,
};

const registryUser: AuthenticatedUser = {
  id: 'registry-1',
  email: 'registry@aun.edu.ng',
  role: RoleName.REGISTRY_OFFICER,
  emailVerified: true,
};

const provostUser: AuthenticatedUser = {
  id: 'provost-1',
  email: 'provost@aun.edu.ng',
  role: RoleName.PROVOST,
  emailVerified: true,
};

function createProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: 'profile-1',
    userId: 'user-1',
    studentId: 'A00022937',
    firstName: 'Ada',
    middleName: null,
    lastName: 'Lovelace',
    school: 'School of Information Technology and Communication',
    major: 'Software Engineering',
    programId: 'program-1',
    programTrack: 'SE',
    catalogYearId: 'catalog-1',
    catalogYearLabel: '2022-2026',
    expectedGraduationTerm: 'Fall 2026',
    concentration: null,
    minor: null,
    currentGpa: 3.75,
    phone: '+2348012345678',
    shippingAddress: 'AUN Campus',
    parentGuardianDetails: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    program: {
      id: 'program-1',
      code: 'SE',
      name: 'Software Engineering',
      degreeName: 'Bachelor of Science in Software Engineering',
      catalogYearId: 'catalog-1',
      minimumCredits: 120,
      minimumGpa: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    ...overrides,
  };
}

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

const emptyOpenErpChecks = {
  concentrationDeclared: null,
  majorAccurate: null,
  concentrationAccurate: null,
  minorAccurate: null,
  fullNameAccurate: null,
  dateOfBirthAccurate: null,
  genderAccurate: null,
  stateOfOriginAccurate: null,
  catalogYearAccurate: null,
};

function createDocument(type: DocumentType) {
  return {
    id: `document-${type}`,
    applicationId: 'application-1',
    type,
    bucket: 'aungtcs',
    storageKey: `graduation-applications/application-1/${type.toLowerCase()}/file-id`,
    originalName: `${type.toLowerCase()}.pdf`,
    mimeType: 'application/pdf',
    sizeBytes: 5000,
    verifiedAt: null,
    verifiedById: null,
    verification: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function createReadyApplication(overrides: Record<string, unknown> = {}) {
  return createApplication({
    studentAttestationAcceptedAt: new Date(),
    openErpChecks: completeOpenErpChecks,
    documents: [
      createDocument(DocumentType.JAMB_ADMISSION_LETTER),
      createDocument(DocumentType.JAMB_RESULT_SLIP),
      createDocument(DocumentType.NIN_SLIP),
      createDocument(DocumentType.CREDIT_AUDIT_SHEET),
      createDocument(DocumentType.UNOFFICIAL_TRANSCRIPT),
    ],
    surveyResponse: {
      id: 'survey-1',
      applicationId: 'application-1',
      answers: {},
      submittedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    ...overrides,
  });
}

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
    studentAttestationAcceptedAt: null,
    openErpChecks: emptyOpenErpChecks,
    eligibility: null,
    finalGpa: 3.75,
    degreeHonors: null,
    completionTerm: 'Fall 2026',
    createdAt: new Date(),
    updatedAt: new Date(),
    term: {
      id: 'term-1',
      name: 'Fall 2026',
      startsAt: null,
      endsAt: null,
      deadlineAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    documents: [],
    surveyResponse: null,
    studentProfile: createProfile(),
    ...overrides,
  };
}

function createService() {
  const mailService: {
    sendMail: jest.Mock<(options: unknown) => Promise<{ accepted: string[] }>>;
  } = {
    sendMail: jest.fn(async (_options: unknown) => ({ accepted: ['ada@aun.edu.ng'] })),
  };
  const prisma: MockPrisma = {
    $transaction: jest.fn(async () => {
      throw new Error('Transaction mock was not configured.');
    }),
    studentProfile: {
      findUnique: jest.fn(async (_args: unknown) => createProfile()),
    },
    academicTerm: {
      upsert: jest.fn(async (_args: unknown) => ({
        id: 'term-1',
        name: 'Fall 2026',
      })),
    },
    graduationApplication: {
      findUnique: jest.fn(async (_args: unknown) => createApplication()),
      findMany: jest.fn(async (_args: unknown) => []),
      findFirst: jest.fn(async (_args: unknown) => null),
      create: jest.fn(async (_args: unknown) => createApplication()),
      update: jest.fn(async (_args: unknown) =>
        createApplication({
          openErpChecks: completeOpenErpChecks,
          studentAttestationAcceptedAt: new Date(),
        }),
      ),
    },
    user: {
      upsert: jest.fn(async (_args: unknown) => ({ id: 'user-1' })),
    },
    clearanceTask: {
      upsert: jest.fn(async (_args: unknown) => ({ id: 'task-1' })),
    },
    auditLog: {
      create: jest.fn(async (_args: unknown) => ({ id: 'audit-1' })),
    },
  };

  prisma.$transaction.mockImplementation(async (input) => {
    if (Array.isArray(input)) {
      return Promise.all(input);
    }

    return input({
      auditLog: prisma.auditLog,
      clearanceTask: prisma.clearanceTask,
      graduationApplication: prisma.graduationApplication,
    });
  });

  return {
    mailService,
    prisma,
    service: new ApplicationsService(
      prisma as unknown as PrismaService,
      mailService as never,
      { createPresignedDownload: jest.fn(async () => ({ downloadUrl: 'https://example.test/file.pdf', expiresIn: 900 })) } as never,
    ),
  };
}

describe(ApplicationsService, () => {
  it('starts a draft application from a completed student profile', async () => {
    const { service, prisma } = createService();

    await expect(service.startStudentApplication(studentUser)).resolves.toMatchObject({
      id: 'application-1',
      status: ApplicationStatus.DRAFT,
      term: 'Fall 2026',
      nameOnCertificate: 'Ada Lovelace',
      profile: {
        major: 'Software Engineering',
      },
    });

    expect(prisma.academicTerm.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { name: 'Fall 2026' },
      }),
    );
    expect(prisma.graduationApplication.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          studentProfileId: 'profile-1',
          termId: 'term-1',
          openErpChecks: emptyOpenErpChecks,
          eligibility: expect.objectContaining({
            status: 'DRAFT_IN_PROGRESS',
            profileComplete: true,
          }),
          nameOnCertificate: 'Ada Lovelace',
          certificateMailingAddress: 'AUN Campus',
        }),
      }),
    );
  });

  it('reuses an existing current application for the same student and term', async () => {
    const { service, prisma } = createService();
    prisma.graduationApplication.findFirst.mockResolvedValueOnce(createApplication());

    await expect(service.startStudentApplication(studentUser)).resolves.toMatchObject({
      id: 'application-1',
    });

    expect(prisma.graduationApplication.create).not.toHaveBeenCalled();
  });

  it('saves current application details and marks the form complete after attestation', async () => {
    const { service, prisma } = createService();
    prisma.graduationApplication.findFirst.mockResolvedValueOnce(createApplication());

    await expect(
      service.updateCurrentStudentApplication(studentUser, {
        nameOnCertificate: 'Someone Else',
        certificateMailingAddress: '12 AUN Road',
        openErpChecks: completeOpenErpChecks,
        studentRemarks: 'Please confirm final spelling.',
        attestationAccepted: true,
      }),
    ).resolves.toMatchObject({
      openErpChecks: completeOpenErpChecks,
      formComplete: true,
    });

    expect(prisma.graduationApplication.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'application-1' },
        data: expect.objectContaining({
          nameOnCertificate: 'Ada Lovelace',
          certificateMailingAddress: '12 AUN Road',
          studentRemarks: 'Please confirm final spelling.',
          studentAttestationAcceptedAt: expect.any(Date),
          openErpChecks: completeOpenErpChecks,
          eligibility: expect.objectContaining({
            status: 'DRAFT_READY',
            applicationFormComplete: true,
          }),
        }),
      }),
    );
  });

  it('rejects starting an application until required profile fields are complete', async () => {
    const { service, prisma } = createService();
    prisma.studentProfile.findUnique.mockResolvedValueOnce(
      createProfile({
        major: null,
        expectedGraduationTerm: null,
      }),
    );

    await expect(service.startStudentApplication(studentUser)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.graduationApplication.create).not.toHaveBeenCalled();
  });

  it('submits a ready graduation application into bursary review', async () => {
    const { service, prisma } = createService();
    const submittedAt = new Date();

    prisma.graduationApplication.findFirst.mockResolvedValueOnce(createReadyApplication());
    prisma.graduationApplication.update.mockResolvedValueOnce(
      createReadyApplication({
        status: ApplicationStatus.BURSARY_PENDING,
        submittedAt,
      }),
    );

    await expect(service.submitCurrentStudentApplication(studentUser)).resolves.toMatchObject({
      status: ApplicationStatus.BURSARY_PENDING,
      submittedAt,
    });

    expect(prisma.clearanceTask.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          applicationId: 'application-1',
          decision: ClearanceDecision.PENDING,
          stage: ClearanceStage.BURSARY,
        }),
      }),
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'SUBMITTED',
          actorId: 'user-1',
          applicationId: 'application-1',
        }),
      }),
    );
    expect(prisma.graduationApplication.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: ApplicationStatus.BURSARY_PENDING,
          submittedAt: expect.any(Date),
          eligibility: expect.objectContaining({
            finalSubmissionReady: true,
            surveySubmitted: true,
          }),
        }),
      }),
    );
  });

  it('moves a cleared program chair application to dean review', async () => {
    const { service, prisma } = createService();

    prisma.graduationApplication.findUnique.mockResolvedValueOnce(
      createReadyApplication({
        status: ApplicationStatus.CHAIR_REVIEW,
      }),
    );
    prisma.graduationApplication.update.mockResolvedValueOnce(
      createReadyApplication({
        status: ApplicationStatus.DEAN_REVIEW,
      }),
    );

    await expect(
      service.decideProgramChair(chairUser, 'application-1', {
        decision: 'CLEARED',
        comments: 'Program requirements have been reviewed and cleared.',
      }),
    ).resolves.toMatchObject({
      status: ApplicationStatus.DEAN_REVIEW,
    });

    expect(prisma.clearanceTask.upsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        update: expect.objectContaining({
          assignedToId: 'chair-1',
          decision: ClearanceDecision.CLEARED,
          remarks: 'Program requirements have been reviewed and cleared.',
        }),
        create: expect.objectContaining({
          assignedToId: 'chair-1',
          decision: ClearanceDecision.CLEARED,
          stage: ClearanceStage.PROGRAM_CHAIR,
        }),
      }),
    );
    expect(prisma.clearanceTask.upsert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        create: expect.objectContaining({
          decision: ClearanceDecision.PENDING,
          stage: ClearanceStage.DEAN,
        }),
      }),
    );
    expect(prisma.graduationApplication.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: ApplicationStatus.DEAN_REVIEW,
          eligibility: expect.objectContaining({
            programChairComments: 'Program requirements have been reviewed and cleared.',
            programChairDecision: 'CLEARED',
          }),
        }),
      }),
    );
  });

  it('keeps a dean not-cleared application in dean follow-up status', async () => {
    const { service, prisma } = createService();

    prisma.graduationApplication.findUnique.mockResolvedValueOnce(
      createReadyApplication({
        status: ApplicationStatus.DEAN_REVIEW,
      }),
    );
    prisma.graduationApplication.update.mockResolvedValueOnce(
      createReadyApplication({
        status: ApplicationStatus.DEAN_NOT_CLEARED,
      }),
    );

    await expect(
      service.decideDean(deanUser, 'application-1', {
        decision: 'NOT_CLEARED',
        comments: 'Dean needs the chair to confirm the outstanding academic note.',
      }),
    ).resolves.toMatchObject({
      status: ApplicationStatus.DEAN_NOT_CLEARED,
    });

    expect(prisma.clearanceTask.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.clearanceTask.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          assignedToId: 'dean-1',
          decision: ClearanceDecision.NOT_CLEARED,
          remarks: 'Dean needs the chair to confirm the outstanding academic note.',
        }),
        create: expect.objectContaining({
          assignedToId: 'dean-1',
          decision: ClearanceDecision.NOT_CLEARED,
          stage: ClearanceStage.DEAN,
        }),
      }),
    );
    expect(prisma.graduationApplication.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: ApplicationStatus.DEAN_NOT_CLEARED,
          eligibility: expect.objectContaining({
            deanComments: 'Dean needs the chair to confirm the outstanding academic note.',
            deanDecision: 'NOT_CLEARED',
          }),
        }),
      }),
    );
  });

  it('moves a cleared final registry application to provost review', async () => {
    const { service, prisma } = createService();

    prisma.graduationApplication.findUnique.mockResolvedValueOnce(
      createReadyApplication({
        status: ApplicationStatus.FINAL_REGISTRY_REVIEW,
      }),
    );
    prisma.graduationApplication.update.mockResolvedValueOnce(
      createReadyApplication({
        status: ApplicationStatus.PROVOST_REVIEW,
      }),
    );

    await expect(
      service.decideFinalRegistry(registryUser, 'application-1', {
        completionTerm: 'Fall',
        finalGpa: 3.82,
        degreeHonors: 'First Class Honors',
        comments: 'Final registry audit completed and cleared for Provost review.',
      }),
    ).resolves.toMatchObject({
      status: ApplicationStatus.PROVOST_REVIEW,
    });

    expect(prisma.clearanceTask.upsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        update: expect.objectContaining({
          assignedToId: 'registry-1',
          decision: ClearanceDecision.CLEARED,
          remarks: expect.stringContaining('Final GPA: 3.82'),
        }),
        create: expect.objectContaining({
          assignedToId: 'registry-1',
          decision: ClearanceDecision.CLEARED,
          stage: ClearanceStage.FINAL_REGISTRY,
        }),
      }),
    );
    expect(prisma.clearanceTask.upsert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        create: expect.objectContaining({
          decision: ClearanceDecision.PENDING,
          stage: ClearanceStage.PROVOST,
        }),
      }),
    );
    expect(prisma.graduationApplication.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: ApplicationStatus.PROVOST_REVIEW,
          completionTerm: 'Fall',
          finalGpa: 3.82,
          degreeHonors: 'First Class Honors',
          eligibility: expect.objectContaining({
            finalRegistryReview: expect.objectContaining({
              comments: 'Final registry audit completed and cleared for Provost review.',
              completionTerm: 'Fall',
              degreeHonors: 'First Class Honors',
              finalGpa: 3.82,
            }),
          }),
        }),
      }),
    );
  });

  it('completes a provost-reviewed application and emails the student', async () => {
    const { service, prisma, mailService } = createService();

    prisma.graduationApplication.findUnique.mockResolvedValueOnce(
      createReadyApplication({
        status: ApplicationStatus.PROVOST_REVIEW,
        studentProfile: createProfile({
          user: {
            email: 'ada@aun.edu.ng',
          },
        }),
      }),
    );
    prisma.graduationApplication.update.mockResolvedValueOnce(
      createReadyApplication({
        status: ApplicationStatus.COMPLETED,
      }),
    );

    await expect(service.signOffProvost(provostUser, 'application-1')).resolves.toMatchObject({
      application: {
        status: ApplicationStatus.COMPLETED,
      },
      emailSent: true,
    });

    expect(prisma.clearanceTask.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          assignedToId: 'provost-1',
          decision: ClearanceDecision.CLEARED,
          remarks: 'Provost final signoff completed.',
        }),
        create: expect.objectContaining({
          assignedToId: 'provost-1',
          decision: ClearanceDecision.CLEARED,
          stage: ClearanceStage.PROVOST,
        }),
      }),
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'PROVOST_SIGNED_OFF',
          actorId: 'provost-1',
          applicationId: 'application-1',
        }),
      }),
    );
    expect(prisma.graduationApplication.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: ApplicationStatus.COMPLETED,
          eligibility: expect.objectContaining({
            provostDecision: 'SIGNED_OFF',
            provostSignedOffById: 'provost-1',
          }),
        }),
      }),
    );
    expect(mailService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'Your graduation clearance application has been approved',
        to: 'ada@aun.edu.ng',
      }),
    );
  });

  it('rejects final submission until all required sections are complete', async () => {
    const { service, prisma } = createService();

    prisma.graduationApplication.findFirst.mockResolvedValueOnce(createApplication());

    await expect(service.submitCurrentStudentApplication(studentUser)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.graduationApplication.update).not.toHaveBeenCalled();
    expect(prisma.clearanceTask.upsert).not.toHaveBeenCalled();
  });
});
