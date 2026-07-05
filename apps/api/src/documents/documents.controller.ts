import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireRoles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { DocumentsService } from './documents.service';

@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
@RequireRoles(RoleName.STUDENT)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get('me')
  listMyDocuments(@CurrentUser() user: AuthenticatedUser) {
    return this.documentsService.listMyDocuments(user);
  }

  @Post('me/presign')
  @HttpCode(200)
  presignUpload(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    return this.documentsService.presignMyUpload(user, body);
  }

  @Post('me/complete')
  @HttpCode(200)
  completeUpload(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    return this.documentsService.completeMyUpload(user, body);
  }

  @Post('me/bursary-receipt/presign')
  @HttpCode(200)
  presignBursaryReceiptUpload(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    return this.documentsService.presignBursaryReceiptUpload(user, body);
  }

  @Post('me/bursary-receipt/complete')
  @HttpCode(200)
  completeBursaryReceiptUpload(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    return this.documentsService.completeBursaryReceiptUpload(user, body);
  }
}
