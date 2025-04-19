import { AdminDto } from '../../user/dto/admin.dto';
import { WorkerStatusCountDto } from './worker-status-count.dto';

export class AdminDashboardDataDto {
  profile: AdminDto;
  totalWorkers: number;
  totalAdmins: number;
  workerCountByStatus: WorkerStatusCountDto;
  attendancePercentage: number;
  top5FutureEvents: any[];
  totalPendingLeaveRequests: number;
}
