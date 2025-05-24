import { Controller, Get, Param, Query } from '@nestjs/common';
import { NoteTypeEnum } from '../enums/note-type.enums';
import { UtilityService } from '../../utility/service/utility.service';
import { NotesAnalyticsService } from '../service/notes-analytics.service';
import { Roles } from '../../auth/decorator/roles.decorator';
import { UserTypeEnum } from '../../user/enums/user-type.enum';

@Controller('notes-analytics')
@Roles(UserTypeEnum.ADMIN)
export class NotesAnalyticsController {
  constructor(private readonly noteAnalyticsService: NotesAnalyticsService) {}

  @Get('/:type')
  async getAnalytics(
    @Param('type') type: NoteTypeEnum,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const validFrom = UtilityService.isValidDateFormat(from)
      ? new Date(from)
      : undefined;
    const validTo = UtilityService.isValidDateFormat(to)
      ? new Date(to)
      : undefined;

    switch (type) {
      case NoteTypeEnum.CHILD_NAMING:
        return this.noteAnalyticsService.getChildNamingAnalytics(
          validFrom,
          validTo,
        );
      case NoteTypeEnum.CHILD_DEDICATION:
        return this.noteAnalyticsService.getChildDedicationAnalytics(
          validFrom,
          validTo,
        );
      case NoteTypeEnum.MARRIAGE:
        return this.noteAnalyticsService.getMarriageAnalytics(
          validFrom,
          validTo,
        );
      case NoteTypeEnum.MEMBER_ATTENDANCE:
        return this.noteAnalyticsService.getAttendanceAnalytics(
          validFrom,
          validTo,
        );
      default:
        throw new Error('Invalid note type for analytics');
    }
  }
}
