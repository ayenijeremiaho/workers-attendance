import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { RequestLeave } from '../enitity/request-leave.entity';
import { CreateRequestLeaveDto } from '../dto/create-request-leave.dto';
import { LeaveStatusEnum } from '../enums/leave-status.enum';
import { PaginationResponseDto } from '../../utility/dto/pagination-response.dto';
import { UtilityService } from '../../utility/service/utility.service';
import { AdminService } from '../../user/service/admin.service';
import { WorkerService } from '../../user/service/worker.service';
import { UserAuth } from '../../auth/interface/auth.interface';
import { DepartmentService } from '../../department/service/department.service';

@Injectable()
export class RequestLeaveService {
  constructor(
    @InjectRepository(RequestLeave)
    private readonly requestLeaveRepository: Repository<RequestLeave>,
    private readonly adminService: AdminService,
    private readonly workerService: WorkerService,
    private readonly departmentService: DepartmentService,
  ) {}

  async requestLeave(
    user: UserAuth,
    dto: CreateRequestLeaveDto,
  ): Promise<RequestLeave> {
    const worker = await this.workerService.get(user.id);

    const existingPendingLeave = await this.requestLeaveRepository.findOne({
      where: {
        worker: { id: worker.id },
        status: LeaveStatusEnum.PENDING,
      },
    });

    if (existingPendingLeave) {
      throw new BadRequestException(
        'You already have a pending leave request. Please wait for it to be processed before requesting another leave.',
      );
    }

    const leaveRequest = this.requestLeaveRepository.create({
      worker,
      dateFrom: new Date(dto.dateFrom),
      dateTo: new Date(dto.dateTo),
      reason: dto.reason,
      status: LeaveStatusEnum.PENDING,
    });

    return this.requestLeaveRepository.save(leaveRequest);
  }

  async actionLeave(
    user: UserAuth,
    leaveId: string,
    status: LeaveStatusEnum,
  ): Promise<RequestLeave> {
    const leaveRequest = await this.requestLeaveRepository.findOne({
      where: { id: leaveId },
      relations: ['actionedBy'],
    });

    if (!leaveRequest) throw new NotFoundException('Leave request not found');
    if (leaveRequest.status !== LeaveStatusEnum.PENDING) {
      throw new BadRequestException(
        'Leave request can only be actioned if it is pending',
      );
    }
    if (
      ![LeaveStatusEnum.APPROVED, LeaveStatusEnum.REJECTED].includes(status)
    ) {
      throw new BadRequestException('Invalid status action');
    }

    const admin = await this.adminService.get(user.id);

    leaveRequest.status = status;
    leaveRequest.actionedBy = admin;

    return this.requestLeaveRepository.save(leaveRequest);
  }

  async deleteLeaveRequest(user: UserAuth, leaveId: string): Promise<void> {
    const leaveRequest = await this.requestLeaveRepository.findOneBy({
      id: leaveId,
      worker: { id: user.id },
    });

    if (!leaveRequest) throw new NotFoundException('Leave request not found');

    if (leaveRequest.status !== LeaveStatusEnum.PENDING) {
      throw new BadRequestException(
        'Only pending leave requests can be deleted',
      );
    }

    await this.requestLeaveRepository.delete(leaveId);
  }

  async hasApprovedLeave(
    workerId: string,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<boolean> {
    const leaveRequest = await this.requestLeaveRepository.findOne({
      where: {
        worker: { id: workerId },
        status: LeaveStatusEnum.APPROVED,
        dateFrom: LessThanOrEqual(dateFrom),
        dateTo: MoreThanOrEqual(dateTo),
      },
      relations: ['worker'],
    });

    return !!leaveRequest;
  }

  async getWorkerLeaveHistory(user: UserAuth): Promise<RequestLeave[]> {
    return await this.requestLeaveRepository.find({
      where: { worker: { id: user.id } },
      relations: ['worker', 'actionedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async getAllLeaveHistory(
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginationResponseDto<RequestLeave>> {
    if (page < 1) {
      throw new BadRequestException('Page number must be greater than 0');
    }

    const [requestLeaves, total] =
      await this.requestLeaveRepository.findAndCount({
        skip: (page - 1) * limit,
        take: limit,
        order: { createdAt: 'DESC' },
        relations: ['worker', 'actionedBy'],
      });

    return UtilityService.createPaginationResponse<RequestLeave>(
      requestLeaves,
      page,
      limit,
      total,
    );
  }

  async getDepartmentLeaveRequests(user: UserAuth): Promise<RequestLeave[]> {
    const departmentLead = await this.departmentService.isWorkerDepartmentLead(
      user.id,
    );
    if (!departmentLead) {
      throw new BadRequestException(
        'You are not authorized to view this department attendance',
      );
    }

    const worker = await this.workerService.get(user.id, true);
    const departmentId = worker.department.id;

    return await this.requestLeaveRepository.find({
      where: { worker: { department: { id: departmentId } } },
      relations: ['worker', 'worker.department', 'actionedBy'],
      order: { createdAt: 'DESC' },
    });
  }
}
