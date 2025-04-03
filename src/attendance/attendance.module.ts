import { Module } from '@nestjs/common';
import { AttendanceService } from './service/attendance.service';
import { AttendanceController } from './controller/attendance.controller';
import { WorkerService } from '../user/service/worker.service';
import { EventService } from '../event/service/event.service';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attendance } from './entity/attendance.entity';
import { Worker } from '../user/entity/worker.entity';
import { Department } from '../department/entity/department.entity';
import { UtilityService } from '../utility/utility.service';
import { EventConfigService } from '../event/service/event-config.service';
import { Event } from '../event/entity/event.entity';
import { EventConfig } from '../event/entity/event-config.entity';
import { AttendanceJobService } from './job/attendance-job';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      Attendance,
      Worker,
      Department,
      Event,
      EventConfig,
    ]),
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
})
export class AttendanceModule {}
