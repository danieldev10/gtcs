import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ApplicationStatus, Prisma, RoleName } from '@prisma/client';
import { z } from 'zod';
import { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';

const sitcProgramTrackValues = [
  'CS_AI',
  'CS_CB',
  'CS_NDC',
  'CS_WMAD',
  'CS_CSA',
  'DSC',
  'IS_GENERIC',
  'IS_DA',
  'IS_ISA',
  'IS_MIS',
  'IS_SAD',
  'SE',
] as const;

type SitcProgramTrackValue = (typeof sitcProgramTrackValues)[number];

const sitcMajorLabels: Record<SitcProgramTrackValue, string> = {
  CS_AI: 'Computer Science - Artificial Intelligence',
  CS_CB: 'Computer Science - Cybersecurity',
  CS_NDC: 'Computer Science - Networks and Distributed Computing',
  CS_WMAD: 'Computer Science - Web and Mobile Application Development',
  CS_CSA: 'Computer Science - Computer Systems Architecture',
  DSC: 'Data Science and Analytics',
  IS_GENERIC: 'Information Systems',
  IS_DA: 'Information Systems - Data Analytics',
  IS_ISA: 'Information Systems - Information Security and Assurance',
  IS_MIS: 'Information Systems - Management Information Systems',
  IS_SAD: 'Information Systems - Systems Analysis and Design',
  SE: 'Software Engineering',
};

const requiredText = (max = 80) => z.string().trim().min(1).max(max);
const optionalText = (max = 160) => z.string().trim().max(max).nullable().optional();

const parentGuardianSchema = z
  .object({
    name: optionalText(120),
    relationship: optionalText(80),
    phone: optionalText(40),
    email: z.string().trim().email().or(z.literal('')).nullable().optional(),
  })
  .optional();

const updateStudentProfileSchema = z.object({
  firstName: requiredText(80).optional(),
  middleName: optionalText(80),
  lastName: requiredText(80).optional(),
  majorCode: z.enum(sitcProgramTrackValues).nullable().optional(),
  programTrack: z.enum(sitcProgramTrackValues).nullable().optional(),
  catalogYearLabel: optionalText(40),
  expectedGraduationTerm: optionalText(80),
  concentration: optionalText(120),
  minor: optionalText(120),
  currentGpa: z.coerce.number().min(0).max(4).nullable().optional(),
  phone: optionalText(40),
  shippingAddress: optionalText(500),
  parentGuardian: parentGuardianSchema,
});

type StudentProfileWithUser = Prisma.StudentProfileGetPayload<{
  include: {
    user: {
      select: {
        email: true;
      };
    };
  };
}>;

type UpdatedStudentProfile = Prisma.StudentProfileGetPayload<{
  include: {
    user: {
      select: {
        email: true;
      };
    };
  };
}>;

type ParentGuardianDetails = {
  name: string | null;
  relationship: string | null;
  phone: string | null;
  email: string | null;
};

@Injectable()
export class StudentProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(user: AuthenticatedUser) {
    this.assertStudent(user);

    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId: user.id },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Student profile was not found for this account.');
    }

    return this.serializeProfile(profile);
  }

  async updateProfile(user: AuthenticatedUser, input: unknown) {
    this.assertStudent(user);

    const parsed = updateStudentProfileSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const academicLinks = await this.resolveAcademicLinks(parsed.data);
    const updateData = this.toUpdateData(parsed.data, academicLinks);

    const profile = await this.prisma.studentProfile.update({
      where: { userId: user.id },
      data: updateData,
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (this.hasNameUpdate(parsed.data)) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          name: [profile.firstName, profile.middleName, profile.lastName].filter(Boolean).join(' '),
        },
      });
    }

    await this.syncDraftApplicationFromProfile(profile, parsed.data);

    return this.serializeProfile(profile);
  }

  private assertStudent(user: AuthenticatedUser) {
    if (user.role !== RoleName.STUDENT) {
      throw new BadRequestException('Only student accounts have student profiles.');
    }
  }

  private async resolveAcademicLinks(data: z.infer<typeof updateStudentProfileSchema>) {
    const majorCode = this.resolveMajorCode(data);
    const catalogYearLabel = this.cleanOptionalText(data.catalogYearLabel);

    if (!majorCode || !catalogYearLabel) {
      return {
        majorCode,
        majorLabel: majorCode ? sitcMajorLabels[majorCode] : null,
        catalogYearId: null,
        programId: null,
      };
    }

    const catalogYear = await this.prisma.catalogYear.upsert({
      where: { label: catalogYearLabel },
      update: {},
      create: { label: catalogYearLabel },
    });

    const program = await this.prisma.program.upsert({
      where: {
        code_catalogYearId: {
          code: majorCode,
          catalogYearId: catalogYear.id,
        },
      },
      update: {
        name: sitcMajorLabels[majorCode],
        degreeName: this.toDegreeName(sitcMajorLabels[majorCode]),
      },
      create: {
        code: majorCode,
        name: sitcMajorLabels[majorCode],
        degreeName: this.toDegreeName(sitcMajorLabels[majorCode]),
        catalogYearId: catalogYear.id,
        minimumCredits: 120,
      },
    });

    return {
      majorCode,
      majorLabel: sitcMajorLabels[majorCode],
      catalogYearId: catalogYear.id,
      programId: program.id,
    };
  }

  private toUpdateData(
    data: z.infer<typeof updateStudentProfileSchema>,
    academicLinks: Awaited<ReturnType<StudentProfileService['resolveAcademicLinks']>>,
  ): Prisma.StudentProfileUpdateInput {
    const updateData: Prisma.StudentProfileUpdateInput = {};

    if (data.firstName !== undefined) {
      updateData.firstName = data.firstName;
    }

    if (data.middleName !== undefined) {
      updateData.middleName = this.cleanOptionalText(data.middleName);
    }

    if (data.lastName !== undefined) {
      updateData.lastName = data.lastName;
    }

    if (data.majorCode !== undefined || data.programTrack !== undefined) {
      updateData.major = academicLinks.majorLabel;
      updateData.programTrack = academicLinks.majorCode;
      updateData.program = academicLinks.programId
        ? { connect: { id: academicLinks.programId } }
        : { disconnect: true };
    }

    if (data.catalogYearLabel !== undefined) {
      updateData.catalogYearLabel = this.cleanOptionalText(data.catalogYearLabel);
      updateData.catalogYear = academicLinks.catalogYearId
        ? { connect: { id: academicLinks.catalogYearId } }
        : { disconnect: true };

      if (!academicLinks.programId) {
        updateData.program = { disconnect: true };
      }
    }

    if (data.expectedGraduationTerm !== undefined) {
      updateData.expectedGraduationTerm = this.cleanOptionalText(data.expectedGraduationTerm);
    }

    if (data.concentration !== undefined) {
      updateData.concentration = this.cleanOptionalText(data.concentration);
    }

    if (data.minor !== undefined) {
      updateData.minor = this.cleanOptionalText(data.minor);
    }

    if (data.currentGpa !== undefined) {
      updateData.currentGpa = data.currentGpa;
    }

    if (data.phone !== undefined) {
      updateData.phone = this.cleanOptionalText(data.phone);
    }

    if (data.shippingAddress !== undefined) {
      updateData.shippingAddress = this.cleanOptionalText(data.shippingAddress);
    }

    if (data.parentGuardian !== undefined) {
      updateData.parentGuardianDetails = this.toParentGuardianJson(data.parentGuardian);
    }

    return updateData;
  }

  private cleanOptionalText(value: string | null | undefined) {
    return value?.trim() ? value.trim() : null;
  }

  private async syncDraftApplicationFromProfile(
    profile: UpdatedStudentProfile,
    data: z.infer<typeof updateStudentProfileSchema>,
  ) {
    const updateData: Prisma.GraduationApplicationUpdateInput = {};

    if (this.hasNameUpdate(data)) {
      updateData.nameOnCertificate = this.joinName(profile);
    }

    if (data.shippingAddress !== undefined) {
      updateData.certificateMailingAddress = profile.shippingAddress;
    }

    if (data.currentGpa !== undefined) {
      updateData.finalGpa = profile.currentGpa;
    }

    if (data.expectedGraduationTerm !== undefined) {
      updateData.completionTerm = profile.expectedGraduationTerm;
    }

    if (Object.keys(updateData).length === 0) {
      return;
    }

    const application = await this.prisma.graduationApplication.findFirst({
      where: {
        studentProfileId: profile.id,
        status: ApplicationStatus.DRAFT,
        submittedAt: null,
      },
      select: { id: true },
    });

    if (!application) {
      return;
    }

    if (data.expectedGraduationTerm !== undefined && profile.expectedGraduationTerm) {
      const term = await this.prisma.academicTerm.upsert({
        where: { name: profile.expectedGraduationTerm },
        update: {},
        create: { name: profile.expectedGraduationTerm },
      });

      updateData.term = { connect: { id: term.id } };
    }

    await this.prisma.graduationApplication.update({
      where: { id: application.id },
      data: updateData,
    });
  }

  private hasNameUpdate(data: z.infer<typeof updateStudentProfileSchema>) {
    return data.firstName !== undefined || data.middleName !== undefined || data.lastName !== undefined;
  }

  private joinName(profile: Pick<UpdatedStudentProfile, 'firstName' | 'middleName' | 'lastName'>) {
    return [profile.firstName, profile.middleName, profile.lastName].filter(Boolean).join(' ');
  }

  private toParentGuardianJson(parentGuardian: z.infer<typeof parentGuardianSchema>) {
    const details: ParentGuardianDetails = {
      name: this.cleanOptionalText(parentGuardian?.name),
      relationship: this.cleanOptionalText(parentGuardian?.relationship),
      phone: this.cleanOptionalText(parentGuardian?.phone),
      email: this.cleanOptionalText(parentGuardian?.email),
    };

    const hasDetails = Object.values(details).some(Boolean);

    return hasDetails ? (details as Prisma.InputJsonObject) : Prisma.DbNull;
  }

  private serializeProfile(profile: StudentProfileWithUser) {
    return {
      id: profile.id,
      userId: profile.userId,
      email: profile.user.email,
      studentId: profile.studentId,
      firstName: profile.firstName,
      middleName: profile.middleName,
      lastName: profile.lastName,
      school: profile.school,
      major: profile.major,
      majorCode: profile.programTrack,
      programTrack: profile.programTrack,
      catalogYearLabel: profile.catalogYearLabel,
      expectedGraduationTerm: profile.expectedGraduationTerm,
      concentration: profile.concentration,
      minor: profile.minor,
      currentGpa: profile.currentGpa === null ? null : Number(profile.currentGpa),
      phone: profile.phone,
      shippingAddress: profile.shippingAddress,
      parentGuardian: this.serializeParentGuardian(profile.parentGuardianDetails),
      updatedAt: profile.updatedAt,
    };
  }

  private serializeParentGuardian(value: Prisma.JsonValue | null): ParentGuardianDetails {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {
        name: null,
        relationship: null,
        phone: null,
        email: null,
      };
    }

    const details = value as Record<string, unknown>;

    return {
      name: this.readString(details.name),
      relationship: this.readString(details.relationship),
      phone: this.readString(details.phone),
      email: this.readString(details.email),
    };
  }

  private readString(value: unknown) {
    return typeof value === 'string' && value.trim() ? value : null;
  }

  private resolveMajorCode(data: z.infer<typeof updateStudentProfileSchema>) {
    return data.majorCode ?? data.programTrack ?? null;
  }

  private toDegreeName(majorLabel: string) {
    return `Bachelor of Science in ${majorLabel}`;
  }
}
