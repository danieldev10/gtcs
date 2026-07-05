import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SurveyController } from './survey.controller';
import { SurveyService } from './survey.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [SurveyController],
  providers: [SurveyService],
})
export class SurveyModule {}
