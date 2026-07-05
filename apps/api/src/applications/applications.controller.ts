import { Body, Controller, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireRoles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApplicationsService } from './applications.service';

@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequireRoles(
    RoleName.BURSARY_OFFICER,
    RoleName.PROGRAM_CHAIR,
    RoleName.DEAN,
    RoleName.REGISTRY_OFFICER,
    RoleName.PROVOST,
    RoleName.ADMIN,
  )
  findMany() {
    return this.applicationsService.findMany();
  }

  @Post('draft')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequireRoles(RoleName.ADMIN)
  createDraft(@Body() body: unknown) {
    return this.applicationsService.createDraft(body);
  }

  @Get('me/current')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequireRoles(RoleName.STUDENT)
  getCurrentStudentApplication(@CurrentUser() user: AuthenticatedUser) {
    return this.applicationsService.getCurrentStudentApplication(user);
  }

  @Post('me/start')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequireRoles(RoleName.STUDENT)
  startStudentApplication(@CurrentUser() user: AuthenticatedUser) {
    return this.applicationsService.startStudentApplication(user);
  }

  @Patch('me/current')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequireRoles(RoleName.STUDENT)
  updateCurrentStudentApplication(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    return this.applicationsService.updateCurrentStudentApplication(user, body);
  }

  @Post('me/submit')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequireRoles(RoleName.STUDENT)
  submitCurrentStudentApplication(@CurrentUser() user: AuthenticatedUser) {
    return this.applicationsService.submitCurrentStudentApplication(user);
  }

  @Post(':id/bursary/payment-request')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequireRoles(RoleName.BURSARY_OFFICER, RoleName.ADMIN)
  requestBursaryPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') applicationId: string,
    @Body() body: unknown,
  ) {
    return this.applicationsService.requestBursaryPayment(user, applicationId, body);
  }

  @Post(':id/bursary/clear')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequireRoles(RoleName.BURSARY_OFFICER, RoleName.ADMIN)
  clearBursary(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') applicationId: string,
    @Body() body: unknown,
  ) {
    return this.applicationsService.clearBursary(user, applicationId, body);
  }

  @Post(':id/registry/intake/clear')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequireRoles(RoleName.REGISTRY_OFFICER, RoleName.ADMIN)
  clearRegistryIntake(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') applicationId: string,
    @Body() body: unknown,
  ) {
    return this.applicationsService.clearRegistryIntake(user, applicationId, body);
  }

  @Post(':id/registry/intake/document-request')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequireRoles(RoleName.REGISTRY_OFFICER, RoleName.ADMIN)
  requestRegistryIntakeDocuments(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') applicationId: string,
    @Body() body: unknown,
  ) {
    return this.applicationsService.requestRegistryIntakeDocuments(user, applicationId, body);
  }

  @Post(':id/registry/final/decision')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequireRoles(RoleName.REGISTRY_OFFICER, RoleName.ADMIN)
  decideFinalRegistry(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') applicationId: string,
    @Body() body: unknown,
  ) {
    return this.applicationsService.decideFinalRegistry(user, applicationId, body);
  }

  @Post(':id/program-chair/decision')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequireRoles(RoleName.PROGRAM_CHAIR, RoleName.ADMIN)
  decideProgramChair(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') applicationId: string,
    @Body() body: unknown,
  ) {
    return this.applicationsService.decideProgramChair(user, applicationId, body);
  }

  @Post(':id/dean/decision')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequireRoles(RoleName.DEAN, RoleName.ADMIN)
  decideDean(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') applicationId: string,
    @Body() body: unknown,
  ) {
    return this.applicationsService.decideDean(user, applicationId, body);
  }

  @Post(':id/provost/signoff')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequireRoles(RoleName.PROVOST, RoleName.ADMIN)
  signOffProvost(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') applicationId: string,
  ) {
    return this.applicationsService.signOffProvost(user, applicationId);
  }

  @Get(':id/documents/:documentId/download')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequireRoles(
    RoleName.BURSARY_OFFICER,
    RoleName.PROGRAM_CHAIR,
    RoleName.DEAN,
    RoleName.REGISTRY_OFFICER,
    RoleName.PROVOST,
    RoleName.ADMIN,
  )
  createStaffDocumentDownload(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') applicationId: string,
    @Param('documentId') documentId: string,
  ) {
    return this.applicationsService.createStaffDocumentDownload(user, applicationId, documentId);
  }
}
