import { Controller, Get, UseGuards } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireRoles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequireRoles(
    RoleName.BURSARY_OFFICER,
    RoleName.PROGRAM_CHAIR,
    RoleName.DEAN,
    RoleName.REGISTRY_OFFICER,
    RoleName.PROVOST,
    RoleName.ADMIN,
  )
  getSummary() {
    return this.dashboardService.getSummary();
  }

  @Get('staff')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequireRoles(
    RoleName.BURSARY_OFFICER,
    RoleName.PROGRAM_CHAIR,
    RoleName.DEAN,
    RoleName.REGISTRY_OFFICER,
    RoleName.PROVOST,
    RoleName.ADMIN,
  )
  getStaffDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.getStaffDashboard(user);
  }
}
