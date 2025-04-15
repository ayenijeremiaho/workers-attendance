import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { RequestLeaveService } from '../service/request-leave.service';
import { CreateRequestLeaveDto } from '../dto/create-request-leave.dto';
import { LeaveStatusEnum } from '../enums/leave-status.enum';
import { RequestLeaveDto } from '../dto/request-leave.dto';
import { plainToInstance } from 'class-transformer';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { Roles } from '../../auth/decorator/roles.decorator';
import { UserTypeEnum } from '../../user/enums/user-type.enum';
import { UtilityService } from '../../utility/service/utility.service';
import { PaginationResponseDto } from '../../utility/dto/pagination-response.dto';
import { RequestLeave } from '../enitity/request-leave.entity';

@Controller('request-leave')
export class RequestLeaveController {
  constructor(private readonly requestLeaveService: RequestLeaveService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserTypeEnum.WORKER)
  async createLeaveRequest(
    @Request() req: any,
    @Body() dto: CreateRequestLeaveDto,
  ): Promise<RequestLeaveDto> {
    const leaveRequest = await this.requestLeaveService.requestLeave(
      req.user,
      dto,
    );
    return plainToInstance(RequestLeaveDto, leaveRequest);
  }

  @Put(':id/action')
  @UseGuards(RolesGuard)
  @Roles(UserTypeEnum.ADMIN)
  async actionLeaveRequest(
    @Request() req: any,
    @Param('id') leaveId: string,
    @Body('status') status: LeaveStatusEnum,
  ): Promise<RequestLeaveDto> {
    const leaveRequest = await this.requestLeaveService.actionLeave(
      req.user,
      leaveId,
      status,
    );

    return plainToInstance(RequestLeaveDto, leaveRequest);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserTypeEnum.WORKER)
  async deleteLeaveRequest(
    @Request() req: any,
    @Param('id') leaveId: string,
  ): Promise<void> {
    return this.requestLeaveService.deleteLeaveRequest(req.user, leaveId);
  }

  @Get('history')
  @UseGuards(RolesGuard)
  @Roles(UserTypeEnum.ADMIN)
  async getAllLeaveHistory(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<PaginationResponseDto<RequestLeaveDto>> {
    const leaveRequests = await this.requestLeaveService.getAllLeaveHistory(
      page,
      limit,
    );

    return UtilityService.getPaginationResponseDto<
      RequestLeave,
      RequestLeaveDto
    >(leaveRequests, RequestLeaveDto);
  }

  @Get('department')
  @UseGuards(RolesGuard)
  @Roles(UserTypeEnum.WORKER)
  async getDepartmentLeaveRequests(@Request() req: any) {
    const departmentLeaveRequests =
      await this.requestLeaveService.getDepartmentLeaveRequests(req.user);

    return departmentLeaveRequests.map((leaveRequest) =>
      plainToInstance(RequestLeaveDto, leaveRequest),
    );
  }

  @Get('worker')
  @UseGuards(RolesGuard)
  @Roles(UserTypeEnum.WORKER)
  async getWorkerLeaveHistory(@Request() req: any) {
    const workerLeaveRequests =
      await this.requestLeaveService.getWorkerLeaveHistory(req.user);

    return workerLeaveRequests.map((leaveRequest) =>
      plainToInstance(RequestLeaveDto, leaveRequest),
    );
  }
}
