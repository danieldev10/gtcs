import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApplicationStatus, Prisma, RoleName } from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';

const staffDashboardConfig = {
  [RoleName.BURSARY_OFFICER]: {
    title: 'Bursary Dashboard',
    roleLabel: 'Bursary Officer',
    officeLabel: 'Bursary',
    queueLabel: 'Financial clearance queue',
    description: 'Review submitted applications that are waiting for fees and financial clearance.',
    statuses: [ApplicationStatus.BURSARY_PENDING, ApplicationStatus.BURSARY_NOT_CLEARED],
  },
  [RoleName.PROGRAM_CHAIR]: {
    title: 'Program Chair Dashboard',
    roleLabel: 'Program Chair',
    officeLabel: 'SITC',
    queueLabel: 'Academic review queue',
    description: 'Review applications that have passed Bursary and Registry intake for program-level clearance.',
    statuses: [ApplicationStatus.CHAIR_REVIEW],
  },
  [RoleName.DEAN]: {
    title: 'Dean Dashboard',
    roleLabel: 'Dean',
    officeLabel: 'SITC',
    queueLabel: 'School approval queue',
    description: 'Review applications after program chair clearance for school-level sign-off.',
    statuses: [ApplicationStatus.DEAN_REVIEW],
  },
  [RoleName.REGISTRY_OFFICER]: {
    title: 'Registry Dashboard',
    roleLabel: 'Registry Officer',
    officeLabel: 'Registry',
    queueLabel: 'Registry clearance queue',
    description: 'Review records intake, final grades, and final registry audit items.',
    statuses: [
      ApplicationStatus.REGISTRY_INTAKE_REVIEW,
      ApplicationStatus.WAITING_FOR_FINAL_GRADES,
      ApplicationStatus.FINAL_REGISTRY_REVIEW,
    ],
  },
  [RoleName.PROVOST]: {
    title: 'Provost Dashboard',
    roleLabel: 'Provost',
    officeLabel: 'Provost',
    queueLabel: 'Final approval queue',
    description: 'Review applications that are ready for final clearance approval.',
    statuses: [ApplicationStatus.PROVOST_REVIEW],
  },
  [RoleName.ADMIN]: {
    title: 'Admin Dashboard',
    roleLabel: 'Admin',
    officeLabel: 'Administration',
    queueLabel: 'All active applications',
    description: 'Monitor every active graduation clearance application across offices.',
    statuses: [
      ApplicationStatus.BURSARY_PENDING,
      ApplicationStatus.BURSARY_NOT_CLEARED,
      ApplicationStatus.CHAIR_REVIEW,
      ApplicationStatus.DEAN_REVIEW,
      ApplicationStatus.REGISTRY_INTAKE_REVIEW,
      ApplicationStatus.WAITING_FOR_FINAL_GRADES,
      ApplicationStatus.FINAL_REGISTRY_REVIEW,
      ApplicationStatus.PROVOST_REVIEW,
      ApplicationStatus.NOT_CLEARED,
      ApplicationStatus.RETURNED_TO_STUDENT,
    ],
  },
} satisfies Record<
  Exclude<RoleName, 'STUDENT'>,
  {
    title: string;
    roleLabel: string;
    officeLabel: string;
    queueLabel: string;
    description: string;
    statuses: ApplicationStatus[];
  }
>;

type StaffApplication = Prisma.GraduationApplicationGetPayload<{
  include: {
    term: true;
    documents: true;
    clearanceTasks: true;
    studentProfile: {
      include: {
        program: true;
      };
    };
  };
}>;

const bursaryReceiptPurpose = 'BURSARY_PAYMENT_RECEIPT';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getSummary() {
    const [totalApplications, statusCounts, recentApplications] = await Promise.all([
      this.prisma.graduationApplication.count(),
      this.prisma.graduationApplication.groupBy({
        by: ['status'],
        _count: true,
      }),
      this.prisma.graduationApplication.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          studentProfile: {
            include: {
              program: true,
            },
          },
          term: true,
        },
      }),
    ]);

    return {
      totalApplications,
      statusCounts: Object.fromEntries(statusCounts.map((item) => [item.status, item._count])),
      recentApplications: recentApplications.map((application) => ({
        id: application.id,
        status: application.status,
        createdAt: application.createdAt,
        submittedAt: application.submittedAt,
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
          program: application.studentProfile.program?.code ?? 'Unassigned',
        },
      })),
      integrations: {
        database: true,
        s3: Boolean(
          this.config.get('AWS_REGION') &&
            this.config.get('AWS_S3_BUCKET') &&
            this.config.get('AWS_ACCESS_KEY_ID') &&
            this.config.get('AWS_SECRET_ACCESS_KEY'),
        ),
        smtp: Boolean(this.config.get('SMTP_USER') && this.config.get('SMTP_PASS')),
      },
    };
  }

  async getStaffDashboard(user: AuthenticatedUser) {
    const config =
      user.role === RoleName.STUDENT
        ? null
        : staffDashboardConfig[user.role as Exclude<RoleName, 'STUDENT'>];

    if (!config) {
      return null;
    }

    const [statusCounts, queueApplications, recentApplications] = await Promise.all([
      this.prisma.graduationApplication.groupBy({
        by: ['status'],
        _count: true,
      }),
      this.prisma.graduationApplication.findMany({
        where: {
          status: {
            in: config.statuses,
          },
        },
        orderBy: [{ submittedAt: 'asc' }, { updatedAt: 'asc' }],
        take: 25,
        include: this.staffApplicationInclude,
      }),
      this.prisma.graduationApplication.findMany({
        where: {
          status: {
            notIn: [ApplicationStatus.DRAFT, ApplicationStatus.WITHDRAWN],
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 8,
        include: this.staffApplicationInclude,
      }),
    ]);

    const counts = Object.fromEntries(statusCounts.map((item) => [item.status, item._count]));
    const activeQueueCount = config.statuses.reduce((total, status) => total + (counts[status] ?? 0), 0);

    return {
      role: user.role,
      ...config,
      activeQueueCount,
      statusCounts: counts,
      queueApplications: queueApplications.map((application) => this.serializeStaffApplication(application)),
      recentApplications: recentApplications.map((application) => this.serializeStaffApplication(application)),
    };
  }

  private get staffApplicationInclude() {
    return {
      term: true,
      documents: true,
      clearanceTasks: true,
      studentProfile: {
        include: {
          program: true,
        },
      },
    };
  }

  private serializeStaffApplication(application: StaffApplication) {
    const bursaryReceipt = this.findBursaryReceipt(application.documents);

    return {
      id: application.id,
      status: application.status,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
      submittedAt: application.submittedAt,
      term: application.term.name,
      documentCount: application.documents.length,
      clearanceCount: application.clearanceTasks.length,
      documents: [...application.documents]
        .sort((first, second) => second.createdAt.getTime() - first.createdAt.getTime())
        .map((document) => ({
          id: document.id,
          type: document.type,
          originalName: document.originalName,
          mimeType: document.mimeType,
          sizeBytes: document.sizeBytes,
          verifiedAt: document.verifiedAt,
          createdAt: document.createdAt,
        })),
      bursaryPaymentRequest: this.readBursaryPaymentRequest(application),
      bursaryReceipt: bursaryReceipt
        ? {
            id: bursaryReceipt.id,
            originalName: bursaryReceipt.originalName,
            mimeType: bursaryReceipt.mimeType,
            sizeBytes: bursaryReceipt.sizeBytes,
            createdAt: bursaryReceipt.createdAt,
          }
        : null,
      student: {
        id: application.studentProfile.studentId,
        name: [
          application.studentProfile.firstName,
          application.studentProfile.middleName,
          application.studentProfile.lastName,
        ]
          .filter(Boolean)
          .join(' '),
        major: application.studentProfile.major ?? application.studentProfile.program?.name ?? 'Unassigned',
      },
    };
  }

  private readBursaryPaymentRequest(application: StaffApplication) {
    const eligibility =
      application.eligibility && typeof application.eligibility === 'object' && !Array.isArray(application.eligibility)
        ? (application.eligibility as Record<string, unknown>)
        : {};
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

  private findBursaryReceipt(documents: StaffApplication['documents']) {
    return documents.find((document) => {
      const verification =
        document.verification && typeof document.verification === 'object' && !Array.isArray(document.verification)
          ? (document.verification as Record<string, unknown>)
          : {};

      return verification.purpose === bursaryReceiptPurpose;
    }) ?? null;
  }
}
