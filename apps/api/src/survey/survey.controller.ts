import { Body, Controller, Get, HttpCode, Patch, UseGuards } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireRoles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SurveyService } from './survey.service';

@Controller('survey')
@UseGuards(JwtAuthGuard, RolesGuard)
@RequireRoles(RoleName.STUDENT)
export class SurveyController {
  constructor(private readonly surveyService: SurveyService) {}

  @Get('report')
  @RequireRoles(RoleName.REGISTRY_OFFICER, RoleName.ADMIN)
  getSurveyReport(@CurrentUser() user: AuthenticatedUser) {
    return this.surveyService.getSurveyReport(user);
  }

  @Get('me')
  getMySurvey(@CurrentUser() user: AuthenticatedUser) {
    return this.surveyService.getMySurvey(user);
  }

  @Patch('me')
  @HttpCode(200)
  saveMySurvey(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    return this.surveyService.saveMySurvey(user, body);
  }
}
