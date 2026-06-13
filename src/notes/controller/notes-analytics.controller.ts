import {Controller, Get, Param, Query, UseGuards} from '@nestjs/common';
import {NoteTypeEnum} from '../enums/note-type.enums';
import {UtilityService} from '../../utility/service/utility.service';
import {NotesAnalyticsService} from '../service/notes-analytics.service';
import {AdminGuard} from '../../admin/guard/admin.guard';
import {RequiresPermission} from '../../admin/decorator/requires-permission.decorator';
import {AdminPermission} from '../../admin/enum/admin-permission.enum';

@UseGuards(AdminGuard)
@RequiresPermission(AdminPermission.NOTES_READ)
@Controller('notes-analytics')
export class NotesAnalyticsController {
    constructor(private readonly noteAnalyticsService: NotesAnalyticsService) {
    }

    @Get('/:type')
    async getAnalytics(
        @Param('type') type: NoteTypeEnum,
        @Query('from') from?: string,
        @Query('to') to?: string,
    ) {
        const validFrom = UtilityService.isValidDateFormat(from) ? new Date(from) : undefined;
        const validTo = UtilityService.isValidDateFormat(to) ? new Date(to) : undefined;

        switch (type) {
            case NoteTypeEnum.CHILD_NAMING:
                return this.noteAnalyticsService.getChildNamingAnalytics(validFrom, validTo);
            case NoteTypeEnum.CHILD_DEDICATION:
                return this.noteAnalyticsService.getChildDedicationAnalytics(validFrom, validTo);
            case NoteTypeEnum.MARRIAGE:
                return this.noteAnalyticsService.getMarriageAnalytics(validFrom, validTo);
            default:
                throw new Error('Invalid note type for analytics');
        }
    }
}
