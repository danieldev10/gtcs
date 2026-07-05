import {
  BadRequestException,
  ForbiddenException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RoleName } from '@prisma/client';
import { describe, expect, it, jest } from '@jest/globals';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthTokenService } from './auth-token.service';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';

type MockPrisma = {
  user: {
    findUnique: jest.Mock<(args: unknown) => Promise<unknown>>;
    create: jest.Mock<(args: unknown) => Promise<unknown>>;
    update: jest.Mock<(args: unknown) => Promise<unknown>>;
  };
  studentProfile: {
    findUnique: jest.Mock<(args: unknown) => Promise<unknown>>;
  };
  emailVerificationToken: {
    create: jest.Mock<(args: unknown) => Promise<unknown>>;
    findUnique: jest.Mock<(args: unknown) => Promise<unknown>>;
    update: jest.Mock<(args: unknown) => Promise<unknown>>;
  };
  $transaction: jest.Mock<(callback: (tx: MockPrisma) => Promise<unknown>) => Promise<unknown>>;
};

function createUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'ada@aun.edu.ng',
    passwordHash: 'hash',
    name: 'Ada Lovelace',
    role: RoleName.STUDENT,
    emailVerifiedAt: null,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    studentProfile: {
      id: 'profile-1',
      studentId: 'A00022937',
      firstName: 'Ada',
      middleName: null,
      lastName: 'Lovelace',
    },
    ...overrides,
  };
}

function createService() {
  const prisma: MockPrisma = {
    user: {
      findUnique: jest.fn(async (_args: unknown) => null),
      create: jest.fn(async (_args: unknown) => createUser()),
      update: jest.fn(async (_args: unknown) => createUser({ emailVerifiedAt: new Date() })),
    },
    studentProfile: {
      findUnique: jest.fn(async (_args: unknown) => null),
    },
    emailVerificationToken: {
      create: jest.fn(async (_args: unknown) => ({ id: 'token-2' })),
      findUnique: jest.fn(async (_args: unknown) => null),
      update: jest.fn(async (_args: unknown) => ({ id: 'token-1' })),
    },
    $transaction: jest.fn(async (callback: (tx: MockPrisma) => Promise<unknown>) => callback(prisma)),
  };
  const passwordService = new PasswordService();
  const config = new ConfigService({
    NODE_ENV: 'test',
    API_PUBLIC_URL: 'http://localhost:4000',
    API_PREFIX: 'api',
    AUTH_JWT_SECRET: 'test-secret-with-more-than-thirty-two-characters',
    AUTH_ACCESS_TOKEN_EXPIRES_SECONDS: 3600,
    AUTH_EMAIL_VERIFICATION_EXPIRES_HOURS: 24,
  });
  const mailService = {
    sendMail: jest.fn(async (_input: unknown) => ({ messageId: 'test-message' })),
  } as unknown as MailService;
  const service = new AuthService(
    prisma as unknown as PrismaService,
    passwordService,
    new AuthTokenService(config),
    mailService,
    config,
  );

  return { service, prisma, mailService };
}

describe(AuthService, () => {
  it('creates a student account and verification email for valid signup data', async () => {
    const { service, prisma, mailService } = createService();

    await expect(
      service.signup({
        email: 'ADA@AUN.EDU.NG',
        password: 'Password123',
        firstName: 'Ada',
        lastName: 'Lovelace',
        studentId: 'a00022937',
      }),
    ).resolves.toMatchObject({
      message: 'Account created. Please check your email to verify your account.',
      emailSent: true,
      user: {
        email: 'ada@aun.edu.ng',
        role: RoleName.STUDENT,
        studentProfile: {
          studentId: 'A00022937',
        },
      },
    });

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'ada@aun.edu.ng',
          role: RoleName.STUDENT,
          studentProfile: expect.objectContaining({
            create: expect.objectContaining({
              studentId: 'A00022937',
            }),
          }),
        }),
      }),
    );
    expect(mailService.sendMail).toHaveBeenCalled();
  });

  it('rejects invalid AUN student IDs', async () => {
    const { service, prisma } = createService();

    await expect(
      service.signup({
        email: 'student@aun.edu.ng',
        password: 'Password123',
        firstName: 'Test',
        lastName: 'Student',
        studentId: '22937',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('blocks login until the email address is verified', async () => {
    const { service, prisma } = createService();
    const passwordHash = await new PasswordService().hashPassword('Password123');

    prisma.user.findUnique.mockResolvedValueOnce(createUser({ passwordHash }));

    await expect(
      service.login({
        email: 'ada@aun.edu.ng',
        password: 'Password123',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects invalid passwords', async () => {
    const { service, prisma } = createService();
    const passwordHash = await new PasswordService().hashPassword('Password123');

    prisma.user.findUnique.mockResolvedValueOnce(
      createUser({
        passwordHash,
        emailVerifiedAt: new Date(),
      }),
    );

    await expect(
      service.login({
        email: 'ada@aun.edu.ng',
        password: 'wrong-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('returns a service unavailable error when the database cannot be reached during login', async () => {
    const { service, prisma } = createService();
    const databaseError = new Error("Can't reach database server at `db.example.test:6543`");
    databaseError.name = 'PrismaClientInitializationError';

    prisma.user.findUnique.mockRejectedValueOnce(databaseError);

    await expect(
      service.login({
        email: 'ada@aun.edu.ng',
        password: 'Password123',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('verifies email tokens and returns a session', async () => {
    const { service, prisma } = createService();

    prisma.emailVerificationToken.findUnique.mockResolvedValueOnce({
      id: 'token-1',
      userId: 'user-1',
      tokenHash: 'stored-token-hash',
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null,
      user: createUser(),
    });

    await expect(service.verifyEmail({ token: 'plain-token-with-enough-length' })).resolves.toMatchObject({
      message: 'Email verified successfully.',
      tokenType: 'Bearer',
      user: {
        emailVerified: true,
      },
    });
    expect(prisma.emailVerificationToken.update).toHaveBeenCalled();
    expect(prisma.user.update).toHaveBeenCalled();
  });
});
