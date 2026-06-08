import { BadRequestException, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';

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

@Injectable()
export class ApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

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
}
