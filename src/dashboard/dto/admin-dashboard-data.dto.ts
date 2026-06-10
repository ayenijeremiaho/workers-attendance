import { DepartmentAttendanceSummary } from '../../attendance/service/attendance.service';

export class AdminDashboardDataDto {
  totalMembers: number;
  totalWorkers: number;
  totalAdmins: number;
  totalCheckInsToday: number;
  workerAttendancePercentage: number;
  congregationAttendancePercentage: number;
  weeklyAttendanceTrend: { week: string; present: number; absent: number }[];
  newMemberRegistrationsTrend: { week: string; newMembers: number; newWorkers: number }[];
  departmentAttendanceSummary: DepartmentAttendanceSummary[];
  topAbsentWorkers: { id: string; name: string; department: string | null; absentCount: number }[];
  membersNotSeenRecently: { id: string; name: string; email: string; lastSeen: Date | null }[];
  upcomingEvents: any[];
  totalPendingLeaveRequests: number;
}
