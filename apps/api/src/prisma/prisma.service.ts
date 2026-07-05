import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    if (process.env.DATABASE_URL) {
      try {
        await this.$connect();
      } catch (error) {
        if (process.env.NODE_ENV === 'production') {
          throw error;
        }

        const message = error instanceof Error ? error.message : 'Unknown database connection error.';
        this.logger.warn(`Database connection is not ready yet. Requests that need the database may fail. ${message}`);
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
