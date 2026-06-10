import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Attendance } from './entity/attendance.entity';
import { AttendanceService } from './service/attendance.service';
import { AttendanceController } from './controller/attendance.controller';
import { AttendanceJobService } from './job/attendance-job';
import { ServiceSlot } from '../event/entity/service-slot.entity';
import { MemberModule } from '../member/member.module';
import { EventModule } from '../event/event.module';
import { UtilityModule } from '../utility/utility.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([Attendance, ServiceSlot]),
    MemberModule,
    EventModule,
    UtilityModule,
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceJobService],
  exports: [TypeOrmModule, AttendanceService],
})
export class AttendanceModule {}
