import { WorkerDto } from '../../user/dto/worker.dto';

export class WorkerDashboardDataDto {
  profile: WorkerDto;
  attendancePercentage: number;
  attendanceHistory: any[];
  top5FutureEvents: any[];
}
