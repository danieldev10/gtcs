import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

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
}
