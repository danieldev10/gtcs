import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireRoles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RoleName } from '@prisma/client';
import { StudentProfileService } from './student-profile.service';

@Controller('student')
@UseGuards(JwtAuthGuard, RolesGuard)
@RequireRoles(RoleName.STUDENT)
export class StudentProfileController {
  constructor(private readonly studentProfileService: StudentProfileService) {}

  @Get('profile')
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.studentProfileService.getProfile(user);
  }

  @Patch('profile')
  updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    return this.studentProfileService.updateProfile(user, body);
  }
}
