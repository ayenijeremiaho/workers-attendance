import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Request,
  UseGuards,
} from '@nestjs/common';
import { DashboardService } from '../service/dashboard.service';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { Roles } from '../../auth/decorator/roles.decorator';
import { UserTypeEnum } from '../../user/enums/user-type.enum';
import { AdminDashboardDataDto } from '../dto/admin-dashboard-data.dto';
import { WorkerDashboardDataDto } from '../dto/worker-dashboard-data.dto';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(UserTypeEnum.ADMIN)
  @Get('/admin')
  async admin(@Request() req: any): Promise<AdminDashboardDataDto> {
    return this.dashboardService.getAdminDashboardData(req.user);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(UserTypeEnum.WORKER)
  @Get('/worker')
  async worker(@Request() req: any): Promise<WorkerDashboardDataDto> {
    return this.dashboardService.getWorkerDashboardData(req.user);
  }
}
