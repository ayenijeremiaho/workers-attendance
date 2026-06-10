import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AttendanceService } from '../service/attendance.service';
import { CheckInDto } from '../dto/check-in.dto';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { Roles } from '../../auth/decorator/roles.decorator';
import { MemberRoleEnum } from '../../member/enums/member-role.enum';
import { AttendanceStatusEnum } from '../enums/check-in.enum';

@Controller('attendances')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @HttpCode(HttpStatus.OK)
  @Post('checkin')
  async checkin(@Request() req: any, @Body() dto: CheckInDto) {
    return this.attendanceService.checkin(req.user, dto);
  }

  @Get('my-history')
  async getMyHistory(
    @Request() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('status') status?: AttendanceStatusEnum,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.attendanceService.getMyHistory(req.user, +page, +limit, status, dateFrom, dateTo);
  }

  @UseGuards(RolesGuard)
  @Roles(MemberRoleEnum.ADMIN)
  @Get('history')
  async getAllHistory(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('memberId') memberId?: string,
    @Query('slotId') slotId?: string,
    @Query('status') status?: AttendanceStatusEnum,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.attendanceService.getAllHistory(+page, +limit, memberId, slotId, status, dateFrom, dateTo);
  }

  @UseGuards(RolesGuard)
  @Roles(MemberRoleEnum.WORKER)
  @Get('history/department')
  async getDepartmentHistory(
    @Request() req: any,
    @Query('slotId', ParseUUIDPipe) slotId: string,
  ) {
    return this.attendanceService.getDepartmentHistory(req.user, slotId);
  }

  @UseGuards(RolesGuard)
  @Roles(MemberRoleEnum.ADMIN)
  @Get('summary/slot/:slotId')
  async getSlotSummary(@Param('slotId', ParseUUIDPipe) slotId: string) {
    return this.attendanceService.getSlotSummary(slotId);
  }

  @UseGuards(RolesGuard)
  @Roles(MemberRoleEnum.ADMIN)
  @Get('leaderboard')
  async getLeaderboard(
    @Query('daysAgo') daysAgo = 7,
    @Query('limit') limit = 10,
  ) {
    return this.attendanceService.getWorkerLeaderboard(+daysAgo, +limit);
  }
}
