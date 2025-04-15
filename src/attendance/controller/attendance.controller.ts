import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AttendanceService } from '../service/attendance.service';
import { CheckInDto } from '../dto/check-in.dto';
import { UtilityService } from '../../utility/service/utility.service';
import { Attendance } from '../entity/attendance.entity';
import { AttendanceDto } from '../dto/attendance.dto';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { Roles } from '../../auth/decorator/roles.decorator';
import { UserTypeEnum } from '../../user/enums/user-type.enum';
import { PaginationResponseDto } from '../../utility/dto/pagination-response.dto';

@Controller('attendances')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @HttpCode(HttpStatus.OK)
  @Post('/checkin')
  @UseGuards(RolesGuard)
  @Roles(UserTypeEnum.WORKER)
  async checkin(@Request() req: any, @Body() checkInDto: CheckInDto) {
    return this.attendanceService.checkin(req.user, checkInDto);
  }

  @Get('/leaderboard')
  @UseGuards(RolesGuard)
  @Roles(UserTypeEnum.ADMIN)
  async leaderboard(
    @Query('daysAgo') daysAgo?: number,
    @Query('limit') limit?: number,
  ) {
    return this.attendanceService.getAttendanceLeaderboard(daysAgo, limit);
  }

  @Get('/my-history')
  @UseGuards(RolesGuard)
  @Roles(UserTypeEnum.WORKER)
  async getWorkerCheckinHistory(
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('attendanceDate') attendanceDate?: string,
  ): Promise<PaginationResponseDto<AttendanceDto>> {
    const history = await this.attendanceService.getWorkersCheckinHistory(
      req.user,
      page,
      limit,
      attendanceDate,
    );
    return UtilityService.getPaginationResponseDto<Attendance, AttendanceDto>(
      history,
      AttendanceDto,
    );
  }

  @Get('/history')
  @UseGuards(RolesGuard)
  @Roles(UserTypeEnum.ADMIN)
  async getAllCheckinHistory(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('workerId') workerId?: string,
    @Query('eventId') eventId?: string,
    @Query('attendanceDate') attendanceDate?: string,
  ): Promise<PaginationResponseDto<AttendanceDto>> {
    const history = await this.attendanceService.getAllCheckInHistory(
      page,
      limit,
      workerId,
      eventId,
      attendanceDate,
    );
    return UtilityService.getPaginationResponseDto<Attendance, AttendanceDto>(
      history,
      AttendanceDto,
    );
  }

  @Get('/history/department')
  @UseGuards(RolesGuard)
  async getDepartmentCheckinHistory(
    @Request() req: any,
    @Query('eventId') eventId: string,
  ): Promise<PaginationResponseDto<AttendanceDto>> {
    const departmentHistory =
      await this.attendanceService.getDepartmentCheckinHistory(
        req.user,
        eventId,
      );
    return UtilityService.getPaginationResponseDto<Attendance, AttendanceDto>(
      departmentHistory,
      AttendanceDto,
    );
  }
}
