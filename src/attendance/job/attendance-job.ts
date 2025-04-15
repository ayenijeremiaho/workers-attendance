import { Cron, CronExpression } from '@nestjs/schedule';
import { AttendanceService } from '../service/attendance.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AttendanceJobService {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async scheduledMarkAbsentees() {
    await this.attendanceService.markAbsentees();
  }
}
