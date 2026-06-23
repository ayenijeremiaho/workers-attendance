import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guard/jwt-auth.guard';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { Roles } from '../../auth/decorator/roles.decorator';
import { MemberRoleEnum } from '../../member/enums/member-role.enum';
import { PrayerMeetingService } from '../service/prayer-meeting.service';
import { SelfSelectPrayerSlotDto } from '../dto/prayer.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(MemberRoleEnum.WORKER)
@Controller('prayer')
export class PrayerWorkerController {
  constructor(private readonly meetingService: PrayerMeetingService) {}

  @Get('available')
  getAvailableMeetings(
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    return this.meetingService.getAvailableMeetings(
      Number(month),
      Number(year),
    );
  }

  @Get('my-roster')
  getMyRoster(
    @Req() req: any,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    return this.meetingService.getMyRoster(
      req.user.workerProfileId,
      Number(month),
      Number(year),
    );
  }

  @Get('my-status')
  getMyStatus(
    @Req() req: any,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    return this.meetingService.getSelectionStatus(
      req.user.workerProfileId,
      Number(month),
      Number(year),
    );
  }

  @Post('select')
  selfSelect(@Req() req: any, @Body() dto: SelfSelectPrayerSlotDto) {
    return this.meetingService.selfSelect(req.user.workerProfileId, dto);
  }
}
