import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../../admin/guard/admin.guard';
import { RequiresPermission } from '../../admin/decorator/requires-permission.decorator';
import { AdminPermission } from '../../admin/enum/admin-permission.enum';
import { PrayerConfigService } from '../service/prayer-config.service';
import { PrayerMeetingService } from '../service/prayer-meeting.service';
import { PrayerRosterService } from '../service/prayer-roster.service';
import {
  CreatePrayerDayConfigDto,
  CreatePrayerFixedAssignmentDto,
  CreatePrayerScheduleRuleDto,
  GenerateMonthlyMeetingsDto,
  OpenSelectionWindowDto,
  ReschedulePrayerEntryDto,
  UpdatePrayerDayConfigDto,
  UpdatePrayerScheduleRuleDto,
  UpsertPrayerScheduleConfigDto,
} from '../dto/prayer.dto';

@UseGuards(AdminGuard)
@Controller('prayer/admin')
export class PrayerAdminController {
  constructor(
    private readonly configService: PrayerConfigService,
    private readonly meetingService: PrayerMeetingService,
    private readonly rosterService: PrayerRosterService,
  ) {}

  @Get('config')
  @RequiresPermission(AdminPermission.PRAYER_READ)
  getConfig() {
    return this.configService.getConfig();
  }

  @Patch('config')
  @RequiresPermission(AdminPermission.PRAYER_WRITE)
  upsertConfig(@Body() dto: UpsertPrayerScheduleConfigDto) {
    return this.configService.upsertConfig(dto);
  }

  @Get('day-configs')
  @RequiresPermission(AdminPermission.PRAYER_READ)
  getDayConfigs() {
    return this.configService.getDayConfigs();
  }

  @Post('day-configs')
  @RequiresPermission(AdminPermission.PRAYER_WRITE)
  createDayConfig(@Body() dto: CreatePrayerDayConfigDto) {
    return this.configService.createDayConfig(dto);
  }

  @Patch('day-configs/:id')
  @RequiresPermission(AdminPermission.PRAYER_WRITE)
  updateDayConfig(
    @Param('id') id: string,
    @Body() dto: UpdatePrayerDayConfigDto,
  ) {
    return this.configService.updateDayConfig(id, dto);
  }

  @Get('rules')
  @RequiresPermission(AdminPermission.PRAYER_READ)
  getRules() {
    return this.configService.getRules();
  }

  @Post('rules')
  @RequiresPermission(AdminPermission.PRAYER_WRITE)
  createRule(@Body() dto: CreatePrayerScheduleRuleDto) {
    return this.configService.createRule(dto);
  }

  @Patch('rules/:id')
  @RequiresPermission(AdminPermission.PRAYER_WRITE)
  updateRule(
    @Param('id') id: string,
    @Body() dto: UpdatePrayerScheduleRuleDto,
  ) {
    return this.configService.updateRule(id, dto);
  }

  @Get('fixed-assignments')
  @RequiresPermission(AdminPermission.PRAYER_READ)
  getFixedAssignments() {
    return this.configService.getFixedAssignments();
  }

  @Post('fixed-assignments')
  @RequiresPermission(AdminPermission.PRAYER_WRITE)
  createFixedAssignment(@Body() dto: CreatePrayerFixedAssignmentDto) {
    return this.configService.createFixedAssignment(dto);
  }

  @Delete('fixed-assignments/:id')
  @RequiresPermission(AdminPermission.PRAYER_WRITE)
  removeFixedAssignment(@Param('id') id: string) {
    return this.configService.removeFixedAssignment(id);
  }

  @Post('meetings/generate')
  @RequiresPermission(AdminPermission.PRAYER_WRITE)
  generateMeetings(@Body() dto: GenerateMonthlyMeetingsDto) {
    return this.meetingService.generateMonthlyMeetings(dto);
  }

  @Post('meetings/open-selection')
  @RequiresPermission(AdminPermission.PRAYER_WRITE)
  openSelection(@Body() dto: OpenSelectionWindowDto) {
    return this.meetingService.openSelectionWindow(dto);
  }

  @Post('meetings/close-selection')
  @RequiresPermission(AdminPermission.PRAYER_WRITE)
  closeSelection(@Body() dto: OpenSelectionWindowDto) {
    return this.meetingService.closeSelectionWindow(dto);
  }

  @Post('roster/auto-assign')
  @RequiresPermission(AdminPermission.PRAYER_WRITE)
  autoAssign(@Query('month') month: string, @Query('year') year: string) {
    return this.rosterService.autoAssign(Number(month), Number(year));
  }

  @Get('roster/validate')
  @RequiresPermission(AdminPermission.PRAYER_READ)
  validateRoster(@Query('month') month: string, @Query('year') year: string) {
    return this.rosterService.validateRoster(Number(month), Number(year));
  }

  @Get('roster/:month/:year')
  @RequiresPermission(AdminPermission.PRAYER_READ)
  getMonthlyRoster(@Param('month') month: string, @Param('year') year: string) {
    return this.meetingService.getMonthlyRoster(Number(month), Number(year));
  }

  @Patch('roster/entries/:id/reschedule')
  @RequiresPermission(AdminPermission.PRAYER_WRITE)
  reschedule(@Param('id') id: string, @Body() dto: ReschedulePrayerEntryDto) {
    return this.rosterService.reschedule(id, dto);
  }
}
