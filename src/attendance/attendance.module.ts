import { Module } from '@nestjs/common';
import { AttendanceService } from './service/attendance.service';
import { AttendanceController } from './controller/attendance.controller';
import { WorkerService } from '../user/service/worker.service';
import { EventService } from '../event/service/event.service';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attendance } from './entity/attendance.entity';
import { UtilityService } from '../utility/service/utility.service';
import { EventConfigService } from '../event/service/event-config.service';
import { AttendanceJobService } from './job/attendance-job';
import { UserModule } from '../user/user.module';
import { DepartmentModule } from '../department/department.module';
import { EventModule } from '../event/event.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([Attendance]),
    UserModule,
    DepartmentModule,
    EventModule,
  ],
  providers: [
    AttendanceService,
    AttendanceJobService,
    WorkerService,
    EventService,
    UtilityService,
    EventConfigService,
  ],
  controllers: [AttendanceController],
  exports: [TypeOrmModule, AttendanceService],
})
export class AttendanceModule {}
