import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { RequestLeaveService } from '../service/request-leave.service';
import { CreateRequestLeaveDto } from '../dto/create-request-leave.dto';
import { LeaveStatusEnum } from '../enums/leave-status.enum';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { Roles } from '../../auth/decorator/roles.decorator';
import { MemberRoleEnum } from '../../member/enums/member-role.enum';

@Controller('leave')
export class RequestLeaveController {
  constructor(private readonly requestLeaveService: RequestLeaveService) {}

  @UseGuards(RolesGuard)
  @Roles(MemberRoleEnum.WORKER)
  @Post()
  async requestLeave(@Request() req: any, @Body() dto: CreateRequestLeaveDto) {
    return this.requestLeaveService.requestLeave(req.user, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(MemberRoleEnum.ADMIN)
  @Patch(':id/action')
  async actionLeave(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: LeaveStatusEnum,
  ) {
    return this.requestLeaveService.actionLeave(req.user, id, status);
  }

  @UseGuards(RolesGuard)
  @Roles(MemberRoleEnum.WORKER)
  @Delete(':id')
  async deleteLeave(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.requestLeaveService.deleteLeaveRequest(req.user, id);
  }

  @UseGuards(RolesGuard)
  @Roles(MemberRoleEnum.WORKER)
  @Get('my-history')
  async getMyHistory(
    @Request() req: any,
    @Query('status') status?: LeaveStatusEnum,
  ) {
    return this.requestLeaveService.getMyLeaveHistory(req.user, status);
  }

  @UseGuards(RolesGuard)
  @Roles(MemberRoleEnum.ADMIN)
  @Get('history')
  async getAllHistory(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('status') status?: LeaveStatusEnum,
  ) {
    return this.requestLeaveService.getAllLeaveHistory(+page, +limit, status);
  }

  @UseGuards(RolesGuard)
  @Roles(MemberRoleEnum.WORKER)
  @Get('department')
  async getDepartmentHistory(
    @Request() req: any,
    @Query('status') status?: LeaveStatusEnum,
  ) {
    return this.requestLeaveService.getDepartmentLeaveRequests(req.user, status);
  }
}
