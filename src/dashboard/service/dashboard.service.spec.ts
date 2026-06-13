import {Test, TestingModule} from '@nestjs/testing';
import {DashboardService} from './dashboard.service';
import {MemberService} from '../../member/service/member.service';
import {AttendanceService} from '../../attendance/service/attendance.service';
import {EventService} from '../../event/service/event.service';
import {DepartmentService} from '../../department/service/department.service';
import {RequestLeaveService} from '../../request-leave/service/request-leave.service';
import {ClassesService} from '../../classes/service/classes.service';
import {AdminService} from '../../admin/service/admin.service';
import {MemberRoleEnum} from '../../member/enums/member-role.enum';
import {MemberStatusEnum} from '../../member/enums/member-status.enum';
import {SessionSurface} from '../../auth/enum/session-surface.enum';

const mockMemberService = {
    getById: jest.fn(),
    count: jest.fn(),
};

const mockAttendanceService = {
    getPersonalAttendancePercentage: jest.fn(),
    getWorkerAttendancePercentage: jest.fn(),
    getCongregationAttendancePercentage: jest.fn(),
    getDepartmentAttendanceSummary: jest.fn(),
    getNewMemberRegistrationsTrend: jest.fn(),
    getMyHistory: jest.fn(),
    getAttendanceStreak: jest.fn().mockResolvedValue(3),
    getMemberRank: jest.fn().mockResolvedValue(1),
    getPeriodStats: jest.fn().mockResolvedValue({present: 5, late: 1, absent: 1, onLeave: 0, total: 7}),
    getWeeklyAttendanceTrend: jest.fn().mockResolvedValue([]),
    getTopAbsentMembers: jest.fn().mockResolvedValue([]),
    getMembersNotSeenSince: jest.fn().mockResolvedValue([]),
    getTotalCheckInsToday: jest.fn().mockResolvedValue(0),
};

const mockEventService = {
    getUpcomingEvents: jest.fn(),
};

const mockDepartmentService = {
    isMemberDepartmentLead: jest.fn(),
};

const mockRequestLeaveService = {
    countPendingLeave: jest.fn(),
};

const mockClassesService = {
    getMyEnrollments: jest.fn(),
    countActiveEnrollments: jest.fn(),
    getClassEnrollmentBreakdown: jest.fn(),
    getClassCompletionsTrend: jest.fn(),
};

const mockAdminService = {
    countActive: jest.fn(),
};

const mockUser = {id: 'member-1', role: MemberRoleEnum.MEMBER, requiresPasswordChange: false, surface: SessionSurface.MEMBER};
const mockWorkerUser = {id: 'worker-1', role: MemberRoleEnum.WORKER, requiresPasswordChange: false, surface: SessionSurface.MEMBER};

const mockMember = {
    id: 'member-1',
    firstname: 'John',
    lastname: 'Doe',
    email: 'john@test.com',
    role: MemberRoleEnum.MEMBER,
    status: MemberStatusEnum.ACTIVE,
    workerProfile: null,
};

const mockWorkerMember = {
    id: 'worker-1',
    firstname: 'Jane',
    lastname: 'Smith',
    email: 'jane@test.com',
    role: MemberRoleEnum.WORKER,
    status: MemberStatusEnum.ACTIVE,
    workerProfile: {
        id: 'wp-1',
        department: {id: 'dept-1', name: 'Music'},
    },
};

describe('DashboardService', () => {
    let service: DashboardService;

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DashboardService,
                {provide: MemberService, useValue: mockMemberService},
                {provide: AttendanceService, useValue: mockAttendanceService},
                {provide: EventService, useValue: mockEventService},
                {provide: DepartmentService, useValue: mockDepartmentService},
                {provide: RequestLeaveService, useValue: mockRequestLeaveService},
                {provide: ClassesService, useValue: mockClassesService},
                {provide: AdminService, useValue: mockAdminService},
            ],
        }).compile();

        service = module.get<DashboardService>(DashboardService);
    });

    describe('getAdminDashboard', () => {
        beforeEach(() => {
            mockMemberService.count.mockResolvedValue(5);
            mockAdminService.countActive.mockResolvedValue(3);
            mockAttendanceService.getWorkerAttendancePercentage.mockResolvedValue(80);
            mockAttendanceService.getCongregationAttendancePercentage.mockResolvedValue(60);
            mockAttendanceService.getDepartmentAttendanceSummary.mockResolvedValue([]);
            mockAttendanceService.getNewMemberRegistrationsTrend.mockResolvedValue([]);
            mockEventService.getUpcomingEvents.mockResolvedValue([]);
            mockRequestLeaveService.countPendingLeave.mockResolvedValue(2);
            mockClassesService.countActiveEnrollments.mockResolvedValue(12);
            mockClassesService.getClassEnrollmentBreakdown.mockResolvedValue([]);
            mockClassesService.getClassCompletionsTrend.mockResolvedValue([]);
        });

        it('should call memberService.count for MEMBER and WORKER roles, and adminService.countActive for admins', async () => {
            await service.getAdminDashboard();

            expect(mockMemberService.count).toHaveBeenCalledTimes(2);
            expect(mockMemberService.count).toHaveBeenCalledWith({where: {role: MemberRoleEnum.MEMBER}});
            expect(mockMemberService.count).toHaveBeenCalledWith({where: {role: MemberRoleEnum.WORKER}});
            expect(mockAdminService.countActive).toHaveBeenCalledTimes(1);
        });

        it('should return merged result with all admin dashboard data', async () => {
            mockMemberService.count
                .mockResolvedValueOnce(100)  // members
                .mockResolvedValueOnce(30);  // workers
            mockAdminService.countActive.mockResolvedValue(5);  // admins
            mockAttendanceService.getWorkerAttendancePercentage.mockResolvedValue(75);
            mockAttendanceService.getCongregationAttendancePercentage.mockResolvedValue(55);
            mockAttendanceService.getDepartmentAttendanceSummary.mockResolvedValue([
                {
                    departmentId: 'dept-1',
                    departmentName: 'Music',
                    totalWorkers: 10,
                    attendedWorkers: 8,
                    attendancePercentage: 80
                },
            ]);
            mockAttendanceService.getNewMemberRegistrationsTrend.mockResolvedValue([
                {week: '2026-06-01', newMembers: 5, newWorkers: 2},
            ]);
            mockEventService.getUpcomingEvents.mockResolvedValue([{id: 'event-1'}]);
            mockRequestLeaveService.countPendingLeave.mockResolvedValue(3);

            const result = await service.getAdminDashboard();

            expect(result).toMatchObject({
                totalMembers: 100,
                totalWorkers: 30,
                totalAdmins: 5,
                workerAttendancePercentage: 75,
                congregationAttendancePercentage: 55,
                totalPendingLeaveRequests: 3,
            });
            expect(result.departmentAttendanceSummary).toHaveLength(1);
            expect(result.newMemberRegistrationsTrend).toHaveLength(1);
            expect(result.upcomingEvents).toHaveLength(1);
        });

        it('should call getWorkerAttendancePercentage with given daysAgo parameter', async () => {
            await service.getAdminDashboard(60);

            expect(mockAttendanceService.getWorkerAttendancePercentage).toHaveBeenCalledWith(60);
            expect(mockAttendanceService.getCongregationAttendancePercentage).toHaveBeenCalledWith(60);
            expect(mockAttendanceService.getDepartmentAttendanceSummary).toHaveBeenCalledWith(60);
        });

        it('should include class analytics in the result', async () => {
            const breakdown = [
                {classId: 'c-1', className: 'Alpha', inProgress: 3, completed: 6, cancelled: 2, completionRate: 75},
            ];
            const trend = [{week: '2026-06-01', completions: 5}];
            mockClassesService.countActiveEnrollments.mockResolvedValue(8);
            mockClassesService.getClassEnrollmentBreakdown.mockResolvedValue(breakdown);
            mockClassesService.getClassCompletionsTrend.mockResolvedValue(trend);

            const result = await service.getAdminDashboard();

            expect(result.totalActiveEnrollments).toBe(8);
            expect(result.classEnrollmentBreakdown).toEqual(breakdown);
            expect(result.classCompletionsTrend).toEqual(trend);
            expect(mockClassesService.getClassCompletionsTrend).toHaveBeenCalledWith(30);
        });
    });

    describe('getMemberDashboard', () => {
        it('should call attendanceService.getPersonalAttendancePercentage with memberId', async () => {
            mockMemberService.getById.mockResolvedValue(mockMember);
            mockAttendanceService.getPersonalAttendancePercentage.mockResolvedValue(90);
            mockAttendanceService.getMyHistory.mockResolvedValue({
                data: [],
                page: 1,
                limit: 5,
                totalCount: 0,
                totalPages: 1
            });
            mockEventService.getUpcomingEvents.mockResolvedValue([]);
            mockClassesService.getMyEnrollments.mockResolvedValue([]);

            await service.getMemberDashboard(mockUser);

            expect(mockAttendanceService.getPersonalAttendancePercentage).toHaveBeenCalledWith(mockUser.id, 30);
        });

        it('should call eventService.getUpcomingEvents', async () => {
            mockMemberService.getById.mockResolvedValue(mockMember);
            mockAttendanceService.getPersonalAttendancePercentage.mockResolvedValue(50);
            mockAttendanceService.getMyHistory.mockResolvedValue({
                data: [],
                page: 1,
                limit: 5,
                totalCount: 0,
                totalPages: 1
            });
            mockEventService.getUpcomingEvents.mockResolvedValue([{id: 'event-1'}, {id: 'event-2'}]);
            mockClassesService.getMyEnrollments.mockResolvedValue([]);

            const result = await service.getMemberDashboard(mockUser);

            expect(mockEventService.getUpcomingEvents).toHaveBeenCalledWith(5);
            expect(result.upcomingEvents).toHaveLength(2);
        });

        it('should call classesService.getMyEnrollments with user id', async () => {
            mockMemberService.getById.mockResolvedValue(mockMember);
            mockAttendanceService.getPersonalAttendancePercentage.mockResolvedValue(50);
            mockAttendanceService.getMyHistory.mockResolvedValue({
                data: [],
                page: 1,
                limit: 5,
                totalCount: 0,
                totalPages: 1
            });
            mockEventService.getUpcomingEvents.mockResolvedValue([]);
            mockClassesService.getMyEnrollments.mockResolvedValue([{id: 'enroll-1'}]);

            const result = await service.getMemberDashboard(mockUser);

            expect(mockClassesService.getMyEnrollments).toHaveBeenCalledWith(mockUser.id);
            expect(result.enrollments).toHaveLength(1);
        });

        it('should return full member dashboard data', async () => {
            mockMemberService.getById.mockResolvedValue(mockMember);
            mockAttendanceService.getPersonalAttendancePercentage.mockResolvedValue(88);
            mockAttendanceService.getMyHistory.mockResolvedValue({
                data: [{id: 'att-1'}],
                page: 1,
                limit: 5,
                totalCount: 1,
                totalPages: 1,
            });
            mockEventService.getUpcomingEvents.mockResolvedValue([{id: 'event-1'}]);
            mockClassesService.getMyEnrollments.mockResolvedValue([{id: 'enroll-1'}]);

            const result = await service.getMemberDashboard(mockUser);

            expect(result.profile).toEqual(mockMember);
            expect(result.personalAttendancePercentage).toBe(88);
            expect(result.recentAttendance).toHaveLength(1);
            expect(result.upcomingEvents).toHaveLength(1);
            expect(result.enrollments).toHaveLength(1);
        });
    });

    describe('getWorkerDashboard', () => {
        it('should include isDepartmentLead in the result', async () => {
            mockMemberService.getById.mockResolvedValue(mockWorkerMember);
            mockAttendanceService.getPersonalAttendancePercentage.mockResolvedValue(70);
            mockAttendanceService.getMyHistory.mockResolvedValue({
                data: [],
                page: 1,
                limit: 5,
                totalCount: 0,
                totalPages: 1
            });
            mockEventService.getUpcomingEvents.mockResolvedValue([]);
            mockRequestLeaveService.countPendingLeave.mockResolvedValue(0);
            mockDepartmentService.isMemberDepartmentLead.mockResolvedValue(false);

            const result = await service.getWorkerDashboard(mockWorkerUser);

            expect(result.isDepartmentLead).toBe(false);
        });

        it('should include pending leave count', async () => {
            mockMemberService.getById.mockResolvedValue(mockWorkerMember);
            mockAttendanceService.getPersonalAttendancePercentage.mockResolvedValue(70);
            mockAttendanceService.getMyHistory.mockResolvedValue({
                data: [],
                page: 1,
                limit: 5,
                totalCount: 0,
                totalPages: 1
            });
            mockEventService.getUpcomingEvents.mockResolvedValue([]);
            mockRequestLeaveService.countPendingLeave.mockResolvedValue(2);
            mockDepartmentService.isMemberDepartmentLead.mockResolvedValue(false);

            const result = await service.getWorkerDashboard(mockWorkerUser);

            expect(result.totalPendingLeaveRequests).toBe(2);
        });

        it('should include departmentLeadDetails when isDepartmentLead is true', async () => {
            mockMemberService.getById.mockResolvedValue(mockWorkerMember);
            mockAttendanceService.getPersonalAttendancePercentage.mockResolvedValue(70);
            mockAttendanceService.getWorkerAttendancePercentage.mockResolvedValue(85);
            mockAttendanceService.getMyHistory.mockResolvedValue({
                data: [],
                page: 1,
                limit: 5,
                totalCount: 0,
                totalPages: 1
            });
            mockEventService.getUpcomingEvents.mockResolvedValue([]);
            mockRequestLeaveService.countPendingLeave
                .mockResolvedValueOnce(1)    // worker's own pending
                .mockResolvedValueOnce(4);   // department's pending
            mockDepartmentService.isMemberDepartmentLead.mockResolvedValue(true);

            const result = await service.getWorkerDashboard(mockWorkerUser);

            expect(result.isDepartmentLead).toBe(true);
            expect(result.departmentLeadDetails).toBeDefined();
            expect(result.departmentLeadDetails.departmentAttendancePercentage).toBe(85);
            expect(result.departmentLeadDetails.totalDepartmentPendingLeaveRequests).toBe(4);
        });

        it('should NOT include departmentLeadDetails when isDepartmentLead is false', async () => {
            mockMemberService.getById.mockResolvedValue(mockWorkerMember);
            mockAttendanceService.getPersonalAttendancePercentage.mockResolvedValue(60);
            mockAttendanceService.getMyHistory.mockResolvedValue({
                data: [],
                page: 1,
                limit: 5,
                totalCount: 0,
                totalPages: 1
            });
            mockEventService.getUpcomingEvents.mockResolvedValue([]);
            mockRequestLeaveService.countPendingLeave.mockResolvedValue(0);
            mockDepartmentService.isMemberDepartmentLead.mockResolvedValue(false);

            const result = await service.getWorkerDashboard(mockWorkerUser);

            expect(result.isDepartmentLead).toBe(false);
            expect(result.departmentLeadDetails).toBeUndefined();
        });
    });
});
