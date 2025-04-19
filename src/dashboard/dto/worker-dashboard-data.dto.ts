import { WorkerDto } from '../../user/dto/worker.dto';

export class WorkerDashboardDataDto {
  profile: WorkerDto;
  departmentLeadDetails: {
    last7DaysDepartmentAttendancePercentage: number;
    totalDepartmentPendingLeaveRequests: number;
  };
  isDepartmentLead: boolean = false;
  attendancePercentage: number;
  attendanceHistory: any[];
  top5FutureEvents: any[];
  totalPendingLeaveRequests: number;
}
