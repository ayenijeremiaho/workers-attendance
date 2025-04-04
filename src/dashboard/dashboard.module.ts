import { Module } from '@nestjs/common';
import { DashboardService } from './service/dashboard.service';
import { EventService } from '../event/service/event.service';
import { AdminService } from '../user/service/admin.service';
import { WorkerService } from '../user/service/worker.service';
import { AttendanceService } from '../attendance/service/attendance.service';
import { EventConfigService } from '../event/service/event-config.service';
import { EventModule } from '../event/event.module';
import { UserModule } from '../user/user.module';
import { UtilityModule } from '../utility/utility.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { DashboardController } from './controller/dashboard.controller';

@Module({
  imports: [EventModule, UserModule, UtilityModule, AttendanceModule],
  providers: [
    DashboardService,
    EventService,
    EventConfigService,
    AdminService,
    WorkerService,
    AttendanceService,
  ],
  controllers: [DashboardController],
})
export class DashboardModule {}
