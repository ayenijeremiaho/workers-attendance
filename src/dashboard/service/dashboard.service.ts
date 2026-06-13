import {Injectable, Logger} from '@nestjs/common';
import {MemberAuth} from '../../auth/interface/auth.interface';
import {MemberService} from '../../member/service/member.service';
import {AttendanceService} from '../../attendance/service/attendance.service';
import {EventService} from '../../event/service/event.service';
import {DepartmentService} from '../../department/service/department.service';
import {RequestLeaveService} from '../../request-leave/service/request-leave.service';
import {ClassesService} from '../../classes/service/classes.service';
import {MemberRoleEnum} from '../../member/enums/member-role.enum';
import {AdminService} from '../../admin/service/admin.service';
import {AdminDashboardDataDto} from '../dto/admin-dashboard-data.dto';
import {WorkerDashboardDataDto} from '../dto/worker-dashboard-data.dto';
import {MemberDashboardDataDto} from '../dto/member-dashboard-data.dto';

@Injectable()
export class DashboardService {
    private readonly logger = new Logger(DashboardService.name);

    constructor(
        private readonly memberService: MemberService,
        private readonly attendanceService: AttendanceService,
        private readonly eventService: EventService,
        private readonly departmentService: DepartmentService,
        private readonly requestLeaveService: RequestLeaveService,
        private readonly classesService: ClassesService,
        private readonly adminService: AdminService,
    ) {
    }

    async getMemberDashboard(user: MemberAuth, daysAgo = 30): Promise<MemberDashboardDataDto> {
        this.logger.log(`Fetching member dashboard for member ${user.id}`);

        const [
            profile,
            personalAttendancePercentage,
            attendanceStreak,
            rank,
            periodStats,
            recentAttendance,
            upcomingEvents,
            enrollments,
        ] = await Promise.all([
            this.memberService.getById(user.id),
            this.attendanceService.getPersonalAttendancePercentage(user.id, daysAgo),
            this.attendanceService.getAttendanceStreak(user.id, MemberRoleEnum.MEMBER),
            this.attendanceService.getMemberRank(user.id, daysAgo, MemberRoleEnum.MEMBER),
            this.attendanceService.getPeriodStats(user.id, daysAgo),
            this.attendanceService.getMyHistory(user, 1, 5),
            this.eventService.getUpcomingEvents(5),
            this.classesService.getMyEnrollments(user.id),
        ]);

        return {
            profile,
            personalAttendancePercentage,
            attendanceStreak,
            rank,
            periodStats,
            recentAttendance: recentAttendance.data,
            upcomingEvents,
            enrollments,
        };
    }

    async getWorkerDashboard(user: MemberAuth, daysAgo = 30): Promise<WorkerDashboardDataDto> {
        this.logger.log(`Fetching worker dashboard for worker ${user.id}`);

        const [
            profile,
            personalAttendancePercentage,
            attendanceStreak,
            rank,
            periodStats,
            recentAttendance,
            upcomingEvents,
            isDepartmentLead,
        ] = await Promise.all([
            this.memberService.getById(user.id, ['workerProfile', 'workerProfile.department']),
            this.attendanceService.getPersonalAttendancePercentage(user.id, daysAgo),
            this.attendanceService.getAttendanceStreak(user.id, MemberRoleEnum.WORKER),
            this.attendanceService.getMemberRank(user.id, daysAgo, MemberRoleEnum.WORKER),
            this.attendanceService.getPeriodStats(user.id, daysAgo),
            this.attendanceService.getMyHistory(user, 1, 5),
            this.eventService.getUpcomingEvents(5),
            this.departmentService.isMemberDepartmentLead(user.id),
        ]);

        const workerProfileId = profile.workerProfile?.id ?? null;
        const totalPendingLeaveRequests = workerProfileId
            ? await this.requestLeaveService.countPendingLeave(workerProfileId)
            : 0;

        const result: WorkerDashboardDataDto = {
            profile,
            isDepartmentLead,
            personalAttendancePercentage,
            attendanceStreak,
            rank,
            periodStats,
            recentAttendance: recentAttendance.data,
            upcomingEvents,
            totalPendingLeaveRequests,
        };

        if (isDepartmentLead) {
            const departmentId = profile.workerProfile?.department?.id;
            if (departmentId) {
                result.departmentLeadDetails = {
                    departmentAttendancePercentage: await this.attendanceService.getWorkerAttendancePercentage(daysAgo, departmentId),
                    totalDepartmentPendingLeaveRequests: await this.requestLeaveService.countPendingLeave(undefined, departmentId),
                };
            }
        }

        return result;
    }

    async getAdminDashboard(daysAgo = 30): Promise<AdminDashboardDataDto> {
        this.logger.log('Fetching admin dashboard');

        const [
            totalMembers,
            totalWorkers,
            totalAdmins,
            totalCheckInsToday,
            workerAttendancePercentage,
            congregationAttendancePercentage,
            weeklyAttendanceTrend,
            newMemberRegistrationsTrend,
            departmentAttendanceSummary,
            topAbsentWorkers,
            membersNotSeenRecently,
            upcomingEvents,
            totalPendingLeaveRequests,
            totalActiveEnrollments,
            classEnrollmentBreakdown,
            classCompletionsTrend,
        ] = await Promise.all([
            this.memberService.count({where: {role: MemberRoleEnum.MEMBER}}),
            this.memberService.count({where: {role: MemberRoleEnum.WORKER}}),
            this.adminService.countActive(),
            this.attendanceService.getTotalCheckInsToday(),
            this.attendanceService.getWorkerAttendancePercentage(daysAgo),
            this.attendanceService.getCongregationAttendancePercentage(daysAgo),
            this.attendanceService.getWeeklyAttendanceTrend(daysAgo),
            this.attendanceService.getNewMemberRegistrationsTrend(daysAgo),
            this.attendanceService.getDepartmentAttendanceSummary(daysAgo),
            this.attendanceService.getTopAbsentMembers(daysAgo, 10, MemberRoleEnum.WORKER),
            this.attendanceService.getMembersNotSeenSince(daysAgo, 20),
            this.eventService.getUpcomingEvents(5),
            this.requestLeaveService.countPendingLeave(),
            this.classesService.countActiveEnrollments(),
            this.classesService.getClassEnrollmentBreakdown(),
            this.classesService.getClassCompletionsTrend(daysAgo),
        ]);

        return {
            totalMembers,
            totalWorkers,
            totalAdmins,
            totalCheckInsToday,
            workerAttendancePercentage,
            congregationAttendancePercentage,
            weeklyAttendanceTrend,
            newMemberRegistrationsTrend,
            departmentAttendanceSummary,
            topAbsentWorkers,
            membersNotSeenRecently,
            upcomingEvents,
            totalPendingLeaveRequests,
            totalActiveEnrollments,
            classEnrollmentBreakdown,
            classCompletionsTrend,
        };
    }
}
