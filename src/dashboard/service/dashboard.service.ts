import { Injectable } from '@nestjs/common';
import { WorkerService } from '../../user/service/worker.service';
import { AdminService } from '../../user/service/admin.service';
import { AttendanceService } from '../../attendance/service/attendance.service';
import { AdminDashboardDataDto } from '../dto/admin-dashboard-data.dto';
import { UserAuth } from '../../auth/interface/auth.interface';
import { EventService } from '../../event/service/event.service';
import { WorkerDashboardDataDto } from '../dto/worker-dashboard-data.dto';
import { plainToInstance } from 'class-transformer';
import { AdminDto } from '../../user/dto/admin.dto';
import { WorkerDto } from '../../user/dto/worker.dto';
import { PaginationResponseDto } from '../../utility/dto/pagination-response.dto';
import { Attendance } from '../../attendance/entity/attendance.entity';
import { Event } from '../../event/entity/event.entity';
import { WorkerStatusCountDto } from '../dto/worker-status-count.dto';
import { DepartmentService } from '../../department/service/department.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly eventService: EventService,
    private readonly adminService: AdminService,
    private readonly workerService: WorkerService,
    private readonly departmentService: DepartmentService,
    private readonly attendanceService: AttendanceService,
  ) {}

  async getWorkerDashboardData(
    user: UserAuth,
    daysAgo: number = 7,
  ): Promise<WorkerDashboardDataDto> {
    const worker = await this.workerService.get(user.id, true);
    const workerDto = plainToInstance(WorkerDto, worker);

    const attendancePercentage =
      await this.attendanceService.getAttendancePercentage(daysAgo, user.id);

    const attendanceHistory: PaginationResponseDto<Attendance> =
      await this.attendanceService.getWorkersCheckinHistory(user, 1, 5);

    const today = new Date();
    const top5FutureEvents: Event[] =
      await this.eventService.getTopEventsByDateCondition('gte', today, 5);

    const isDepartmentLead: boolean =
      await this.departmentService.isWorkerDepartmentLead(worker.id);

    let departmentAttendancePercentage = null;
    if (isDepartmentLead) {
      departmentAttendancePercentage =
        await this.attendanceService.getAttendancePercentage(
          daysAgo,
          null,
          worker.department.id,
        );
    }

    return {
      profile: workerDto,
      isDepartmentLead,
      ...(departmentAttendancePercentage && {
        last7DaysDepartmentAttendancePercentage: departmentAttendancePercentage,
      }),
      attendancePercentage,
      attendanceHistory: attendanceHistory?.data,
      top5FutureEvents,
    };
  }

  async getAdminDashboardData(
    user: UserAuth,
    daysAgo: number = 7,
  ): Promise<AdminDashboardDataDto> {
    const admin = await this.adminService.get(user.id);
    const adminDto = plainToInstance(AdminDto, admin);

    const totalWorkers = await this.workerService.count();
    const totalAdmins = await this.adminService.count();

    const workerCountByStatusRaw =
      await this.workerService.getWorkersCountByStatus();
    const workerCountByStatus = WorkerStatusCountDto.fromJson(
      workerCountByStatusRaw,
    );

    const attendancePercentage =
      await this.attendanceService.getAttendancePercentage(daysAgo);

    const today = new Date();
    const top5FutureEvents: Event[] =
      await this.eventService.getTopEventsByDateCondition('gte', today, 5);

    return {
      profile: adminDto,
      totalWorkers,
      totalAdmins,
      workerCountByStatus,
      attendancePercentage,
      top5FutureEvents,
    };
  }
}
