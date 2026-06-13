export class MemberDashboardDataDto {
    profile: any;
    personalAttendancePercentage: number;
    attendanceStreak: number;
    rank: number;
    periodStats: {
        present: number;
        late: number;
        absent: number;
        onLeave: number;
        total: number;
    };
    recentAttendance: any[];
    upcomingEvents: any[];
    enrollments: any[];
}
