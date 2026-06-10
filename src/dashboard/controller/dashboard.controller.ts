import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from '../service/dashboard.service';
import { JwtAuthGuard } from '../../auth/guard/jwt-auth.guard';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { Roles } from '../../auth/decorator/roles.decorator';
import { MemberRoleEnum } from '../../member/enums/member-role.enum';
import { CurrentUser } from '../../auth/decorator/current-user.decorator';
import { MemberAuth } from '../../auth/interface/auth.interface';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('member')
  getMemberDashboard(
    @CurrentUser() user: MemberAuth,
    @Query('daysAgo') daysAgo = 30,
  ) {
    return this.dashboardService.getMemberDashboard(user, Number(daysAgo));
  }

  @UseGuards(RolesGuard)
  @Roles(MemberRoleEnum.WORKER, MemberRoleEnum.ADMIN)
  @Get('worker')
  getWorkerDashboard(
    @CurrentUser() user: MemberAuth,
    @Query('daysAgo') daysAgo = 30,
  ) {
    return this.dashboardService.getWorkerDashboard(user, Number(daysAgo));
  }

  @UseGuards(RolesGuard)
  @Roles(MemberRoleEnum.ADMIN)
  @Get('admin')
  getAdminDashboard(@Query('daysAgo') daysAgo = 30) {
    return this.dashboardService.getAdminDashboard(Number(daysAgo));
  }
}
