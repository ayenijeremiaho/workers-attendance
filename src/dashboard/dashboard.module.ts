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
import { DepartmentModule } from '../department/department.module';
import { DepartmentService } from '../department/service/department.service';
import { RequestLeaveService } from '../request-leave/service/request-leave.service';
import { RequestLeaveModule } from '../request-leave/request-leave.module';

@Module({
  imports: [
    EventModule,
    UserModule,
    UtilityModule,
    AttendanceModule,
    DepartmentModule,
    RequestLeaveModule,
  ],
  providers: [
    DashboardService,
    EventService,
    EventConfigService,
    AdminService,
    WorkerService,
    AttendanceService,
    DepartmentService,
    RequestLeaveService,
  ],
  controllers: [DashboardController],
})
export class DashboardModule {}
