import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RoleName, User } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { z } from 'zod';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthTokenService } from './auth-token.service';
import { AuthenticatedUser } from './auth.types';
import { PasswordService } from './password.service';

const aunStudentIdSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .refine((value) => /^A\d{8}$/.test(value), {
    message: 'AUN Student ID must look like A00022937.',
  });

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

const signupSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
  firstName: z.string().trim().min(1).max(80),
  middleName: optionalText,
  lastName: z.string().trim().min(1).max(80),
  studentId: aunStudentIdSchema,
  phone: optionalText,
});

const loginSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1),
});

const verifyEmailSchema = z.object({
  token: z.string().trim().min(20),
});

const resendVerificationSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
});

type UserWithProfile = User & {
  studentProfile?: {
    id: string;
    studentId: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
  } | null;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly authTokenService: AuthTokenService,
    private readonly mailService: MailService,
    private readonly config: ConfigService,
  ) {}

  async signup(input: unknown) {
    const parsed = signupSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const data = parsed.data;
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('An account already exists for this email address.');
    }

    const existingStudent = await this.prisma.studentProfile.findUnique({
      where: { studentId: data.studentId },
      select: { id: true },
    });

    if (existingStudent) {
      throw new ConflictException('An account already exists for this AUN Student ID.');
    }

    const passwordHash = await this.passwordService.hashPassword(data.password);
    const verificationToken = this.createPlainToken();
    const verificationTokenHash = this.hashToken(verificationToken);
    const expiresAt = this.createVerificationExpiry();
    const name = this.joinName(data.firstName, data.middleName, data.lastName);

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        name,
        role: RoleName.STUDENT,
        studentProfile: {
          create: {
            studentId: data.studentId,
            firstName: data.firstName,
            middleName: data.middleName,
            lastName: data.lastName,
            phone: data.phone,
          },
        },
        emailVerificationTokens: {
          create: {
            tokenHash: verificationTokenHash,
            expiresAt,
          },
        },
      },
      include: {
        studentProfile: true,
      },
    });

    const emailSent = await this.sendVerificationEmail(user, verificationToken);

    return {
      message: 'Account created. Please check your email to verify your account.',
      emailSent,
      user: this.serializeUser(user),
      debug: this.createDebugVerificationToken(verificationToken),
    };
  }

  async login(input: unknown) {
    const parsed = loginSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const user = await this.runLoginDatabaseOperation(() =>
      this.prisma.user.findUnique({
        where: { email: parsed.data.email },
        include: { studentProfile: true },
      }),
    );

    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const passwordMatches = await this.passwordService.verifyPassword(
      parsed.data.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (!user.emailVerifiedAt) {
      throw new ForbiddenException('Please verify your email before signing in.');
    }

    const updatedUser = await this.runLoginDatabaseOperation(() =>
      this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
        include: { studentProfile: true },
      }),
    );

    return this.createSessionResponse(updatedUser);
  }

  async verifyEmail(input: unknown) {
    const parsed = verifyEmailSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const tokenHash = this.hashToken(parsed.data.token);
    const tokenRecord = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            studentProfile: true,
          },
        },
      },
    });

    if (!tokenRecord || tokenRecord.consumedAt || tokenRecord.expiresAt < new Date()) {
      throw new BadRequestException('Verification link is invalid or expired.');
    }

    const verifiedUser = await this.prisma.$transaction(async (tx) => {
      await tx.emailVerificationToken.update({
        where: { id: tokenRecord.id },
        data: { consumedAt: new Date() },
      });

      return tx.user.update({
        where: { id: tokenRecord.userId },
        data: {
          emailVerifiedAt: tokenRecord.user.emailVerifiedAt ?? new Date(),
        },
        include: {
          studentProfile: true,
        },
      });
    });

    return {
      message: 'Email verified successfully.',
      ...this.createSessionResponse(verifiedUser),
    };
  }

  async resendVerification(input: unknown) {
    const parsed = resendVerificationSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const user = await this.prisma.user.findUnique({
      where: { email: parsed.data.email },
      include: { studentProfile: true },
    });

    if (!user || user.emailVerifiedAt) {
      return {
        message: 'If the account needs verification, a new verification email has been sent.',
        emailSent: false,
      };
    }

    const verificationToken = this.createPlainToken();

    await this.prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(verificationToken),
        expiresAt: this.createVerificationExpiry(),
      },
    });

    const emailSent = await this.sendVerificationEmail(user, verificationToken);

    return {
      message: 'If the account needs verification, a new verification email has been sent.',
      emailSent,
      debug: this.createDebugVerificationToken(verificationToken),
    };
  }

  async getCurrentUser(user: AuthenticatedUser) {
    const account = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: {
        studentProfile: true,
      },
    });

    if (!account) {
      throw new UnauthorizedException('Account no longer exists.');
    }

    return this.serializeUser(account);
  }

  private createSessionResponse(user: UserWithProfile) {
    const authUser = this.toAuthenticatedUser(user);

    return {
      accessToken: this.authTokenService.signAccessToken(authUser),
      tokenType: 'Bearer',
      expiresIn: this.config.getOrThrow<number>('AUTH_ACCESS_TOKEN_EXPIRES_SECONDS'),
      user: this.serializeUser(user),
    };
  }

  private serializeUser(user: UserWithProfile) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: Boolean(user.emailVerifiedAt),
      studentProfile: user.studentProfile
        ? {
            id: user.studentProfile.id,
            studentId: user.studentProfile.studentId,
            firstName: user.studentProfile.firstName,
            middleName: user.studentProfile.middleName,
            lastName: user.studentProfile.lastName,
          }
        : null,
    };
  }

  private toAuthenticatedUser(user: UserWithProfile): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      studentProfileId: user.studentProfile?.id,
      emailVerified: Boolean(user.emailVerifiedAt),
    };
  }

  private async sendVerificationEmail(user: UserWithProfile, token: string) {
    const verificationUrl = this.createVerificationUrl(token);
    const firstName = user.studentProfile?.firstName ?? user.name ?? 'there';

    try {
      await this.mailService.sendMail({
        to: user.email,
        subject: 'Verify your AUN SITC graduation account',
        text: [
          `Hello ${firstName},`,
          '',
          'Please verify your email address to finish creating your graduation clearance account.',
          verificationUrl,
          '',
          'This link expires in 24 hours.',
        ].join('\n'),
        html: `
          <p>Hello ${firstName},</p>
          <p>Please verify your email address to finish creating your graduation clearance account.</p>
          <p><a href="${verificationUrl}">Verify your email</a></p>
          <p>This link expires in 24 hours.</p>
        `,
      });

      return true;
    } catch (error) {
      if (this.config.get<string>('NODE_ENV') === 'production') {
        throw error;
      }

      return false;
    }
  }

  private createVerificationUrl(token: string) {
    const webPublicUrl = this.config.getOrThrow<string>('WEB_PUBLIC_URL').replace(/\/$/, '');

    return `${webPublicUrl}/verify-email?token=${encodeURIComponent(token)}`;
  }

  private createVerificationExpiry() {
    const hours = this.config.getOrThrow<number>('AUTH_EMAIL_VERIFICATION_EXPIRES_HOURS');

    return new Date(Date.now() + hours * 60 * 60 * 1000);
  }

  private createPlainToken() {
    return randomBytes(32).toString('base64url');
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private joinName(firstName: string, middleName: string | undefined, lastName: string) {
    return [firstName, middleName, lastName].filter(Boolean).join(' ');
  }

  private createDebugVerificationToken(token: string) {
    return this.config.get<string>('NODE_ENV') === 'production' ? undefined : { verificationToken: token };
  }

  private async runLoginDatabaseOperation<T>(operation: () => Promise<T>) {
    try {
      return await operation();
    } catch (error) {
      if (this.isDatabaseConnectionError(error)) {
        throw new ServiceUnavailableException(
          'Database connection is unavailable. Check the Supabase database connection and try again.',
        );
      }

      throw error;
    }
  }

  private isDatabaseConnectionError(error: unknown) {
    return (
      error instanceof Error &&
      (error.name === 'PrismaClientInitializationError' ||
        error.message.includes("Can't reach database server"))
    );
  }
}
