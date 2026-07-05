import { BadRequestException } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { describe, expect, it, jest } from '@jest/globals';
import { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { StudentProfileService } from './student-profile.service';

type MockPrisma = {
  studentProfile: {
    findUnique: jest.Mock<(args: unknown) => Promise<unknown>>;
    update: jest.Mock<(args: unknown) => Promise<unknown>>;
  };
  user: {
    update: jest.Mock<(args: unknown) => Promise<unknown>>;
  };
  academicTerm: {
    upsert: jest.Mock<(args: unknown) => Promise<unknown>>;
  };
  graduationApplication: {
    findFirst: jest.Mock<(args: unknown) => Promise<unknown>>;
    update: jest.Mock<(args: unknown) => Promise<unknown>>;
  };
  catalogYear: {
    upsert: jest.Mock<(args: unknown) => Promise<unknown>>;
  };
  program: {
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

function createProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: 'profile-1',
    userId: 'user-1',
    studentId: 'A00022937',
    firstName: 'Ada',
    middleName: null,
    lastName: 'Lovelace',
    school: 'School of Information Technology and Communication',
    major: null,
    programId: null,
    programTrack: null,
    catalogYearId: null,
    catalogYearLabel: null,
    expectedGraduationTerm: null,
    concentration: null,
    minor: null,
    currentGpa: null,
    phone: null,
    shippingAddress: null,
    parentGuardianDetails: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      email: 'ada@aun.edu.ng',
    },
    ...overrides,
  };
}

function createService() {
  const prisma: MockPrisma = {
    studentProfile: {
      findUnique: jest.fn(async (_args: unknown) => createProfile()),
      update: jest.fn(async (_args: unknown) => createProfile()),
    },
    user: {
      update: jest.fn(async (_args: unknown) => ({ id: 'user-1' })),
    },
    academicTerm: {
      upsert: jest.fn(async (_args: unknown) => ({ id: 'term-1', name: 'Fall 2026' })),
    },
    graduationApplication: {
      findFirst: jest.fn(async (_args: unknown) => null),
      update: jest.fn(async (_args: unknown) => ({ id: 'application-1' })),
    },
    catalogYear: {
      upsert: jest.fn(async (_args: unknown) => ({ id: 'catalog-1', label: '2022-2025' })),
    },
    program: {
      upsert: jest.fn(async (_args: unknown) => ({ id: 'program-1', code: 'SE' })),
    },
  };

  return {
    prisma,
    service: new StudentProfileService(prisma as unknown as PrismaService),
  };
}

describe(StudentProfileService, () => {
  it('returns the current student profile', async () => {
    const { service, prisma } = createService();

    await expect(service.getProfile(studentUser)).resolves.toMatchObject({
      email: 'ada@aun.edu.ng',
      studentId: 'A00022937',
      firstName: 'Ada',
      parentGuardian: {
        name: null,
      },
    });

    expect(prisma.studentProfile.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
      }),
    );
  });

  it('updates profile fields and normalizes optional values', async () => {
    const { service, prisma } = createService();

    prisma.studentProfile.update.mockResolvedValueOnce(
      createProfile({
        firstName: 'Ada',
        middleName: 'Byron',
        lastName: 'Lovelace',
        major: 'Software Engineering',
        programId: 'program-1',
        programTrack: 'SE',
        catalogYearId: 'catalog-1',
        catalogYearLabel: '2022-2025',
        expectedGraduationTerm: 'Fall 2026',
        currentGpa: 3.75,
        parentGuardianDetails: {
          name: 'Annabella Milbanke',
          relationship: 'Parent',
          phone: '+2348012345678',
          email: 'guardian@example.com',
        },
      }),
    );

    await expect(
      service.updateProfile(studentUser, {
        firstName: 'Ada',
        middleName: 'Byron',
        lastName: 'Lovelace',
        majorCode: 'SE',
        catalogYearLabel: '2022-2025',
        expectedGraduationTerm: 'Fall 2026',
        currentGpa: '3.75',
        parentGuardian: {
          name: 'Annabella Milbanke',
          relationship: 'Parent',
          phone: '+2348012345678',
          email: 'guardian@example.com',
        },
      }),
    ).resolves.toMatchObject({
      major: 'Software Engineering',
      majorCode: 'SE',
      currentGpa: 3.75,
      parentGuardian: {
        name: 'Annabella Milbanke',
      },
    });

    expect(prisma.studentProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
        data: expect.objectContaining({
          major: 'Software Engineering',
          programTrack: 'SE',
          program: { connect: { id: 'program-1' } },
          catalogYear: { connect: { id: 'catalog-1' } },
          currentGpa: 3.75,
        }),
      }),
    );
    expect(prisma.catalogYear.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { label: '2022-2025' },
      }),
    );
    expect(prisma.program.upsert).toHaveBeenCalled();
    expect(prisma.user.update).toHaveBeenCalled();
  });

  it('syncs signup/profile fields into the open draft application', async () => {
    const { service, prisma } = createService();

    prisma.studentProfile.update.mockResolvedValueOnce(
      createProfile({
        firstName: 'Ada',
        middleName: 'Byron',
        lastName: 'Lovelace',
        expectedGraduationTerm: 'Spring 2027',
        currentGpa: 3.9,
        shippingAddress: 'New AUN Mailing Address',
      }),
    );
    prisma.graduationApplication.findFirst.mockResolvedValueOnce({ id: 'application-1' });
    prisma.academicTerm.upsert.mockResolvedValueOnce({ id: 'term-2', name: 'Spring 2027' });

    await service.updateProfile(studentUser, {
      firstName: 'Ada',
      middleName: 'Byron',
      lastName: 'Lovelace',
      expectedGraduationTerm: 'Spring 2027',
      currentGpa: '3.90',
      shippingAddress: 'New AUN Mailing Address',
    });

    expect(prisma.graduationApplication.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          studentProfileId: 'profile-1',
          status: 'DRAFT',
          submittedAt: null,
        }),
      }),
    );
    expect(prisma.graduationApplication.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'application-1' },
        data: expect.objectContaining({
          nameOnCertificate: 'Ada Byron Lovelace',
          certificateMailingAddress: 'New AUN Mailing Address',
          completionTerm: 'Spring 2027',
          finalGpa: 3.9,
          term: { connect: { id: 'term-2' } },
        }),
      }),
    );
  });

  it('rejects invalid GPA values', async () => {
    const { service, prisma } = createService();

    await expect(
      service.updateProfile(studentUser, {
        currentGpa: 5,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.studentProfile.update).not.toHaveBeenCalled();
  });

  it('rejects non-student accounts', async () => {
    const { service } = createService();

    await expect(
      service.getProfile({
        ...studentUser,
        role: RoleName.ADMIN,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
