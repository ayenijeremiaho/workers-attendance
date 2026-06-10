import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AttendanceService } from '../service/attendance.service';

@Injectable()
export class AttendanceJobService {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async scheduledMarkAbsentees(): Promise<void> {
    await this.attendanceService.markAbsentees();
  }
}
