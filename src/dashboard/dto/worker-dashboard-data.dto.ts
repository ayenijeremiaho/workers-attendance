import { WorkerDto } from '../../user/dto/worker.dto';

export class WorkerDashboardDataDto {
  profile: WorkerDto;
  isDepartmentLead: boolean = false;
  last7DaysDepartmentAttendancePercentage?: number;
  attendancePercentage: number;
  attendanceHistory: any[];
  top5FutureEvents: any[];
}
