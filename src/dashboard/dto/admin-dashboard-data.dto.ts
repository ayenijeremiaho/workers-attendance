import { AdminDto } from '../../user/dto/admin.dto';

export class AdminDashboardDataDto {
  profile: AdminDto;
  totalWorkers: number;
  totalAdmins: number;
  workerCountByStatus: any;
  attendancePercentage: number;
  top5FutureEvents: any[];
}
