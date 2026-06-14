import {Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Request, UseGuards} from '@nestjs/common';
import {AdminGuard} from '../../admin/guard/admin.guard';
import {RequiresPermission} from '../../admin/decorator/requires-permission.decorator';
import {AdminPermission} from '../../admin/enum/admin-permission.enum';
import {FollowUpService} from '../service/follow-up.service';
import {CreateFirstTimerDto} from '../dto/create-first-timer.dto';
import {ReassignTaskDto} from '../dto/reassign-task.dto';
import {BulkUpdateTasksDto} from '../dto/bulk-update-tasks.dto';
import {FollowUpTaskStatusEnum, FollowUpTaskTypeEnum} from '../enums/follow-up.enum';

@UseGuards(AdminGuard)
@Controller('admin/follow-up')
export class FollowUpAdminController {
    constructor(private readonly followUpService: FollowUpService) {}

    @RequiresPermission(AdminPermission.FOLLOW_UP_WRITE)
    @Post('first-timers')
    async createFirstTimer(@Request() req: any, @Body() dto: CreateFirstTimerDto) {
        return this.followUpService.createFirstTimerByAdmin(dto, req.user.id);
    }

    @RequiresPermission(AdminPermission.FOLLOW_UP_READ)
    @Get('first-timers')
    async getFirstTimers(
        @Query('page') page = 1,
        @Query('limit') limit = 20,
        @Query('eventId') eventId?: string,
    ) {
        return this.followUpService.getFirstTimers(+page, +limit, eventId);
    }

    @RequiresPermission(AdminPermission.FOLLOW_UP_READ)
    @Get('tasks')
    async getAllTasks(
        @Query('page') page = 1,
        @Query('limit') limit = 20,
        @Query('status') status?: FollowUpTaskStatusEnum,
        @Query('type') type?: FollowUpTaskTypeEnum,
    ) {
        return this.followUpService.getAllTasks(+page, +limit, status, type);
    }

    @RequiresPermission(AdminPermission.FOLLOW_UP_WRITE)
    @Patch('tasks/:id/reassign')
    async reassignTask(
        @Request() req: any,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: ReassignTaskDto,
    ) {
        return this.followUpService.reassignTask(id, dto, req.user.id);
    }

    @RequiresPermission(AdminPermission.FOLLOW_UP_WRITE)
    @Patch('tasks/bulk')
    async bulkUpdateTasks(@Body() dto: BulkUpdateTasksDto) {
        return this.followUpService.bulkUpdateTasks(dto);
    }

    @RequiresPermission(AdminPermission.FOLLOW_UP_READ)
    @Get('report')
    async getReport(
        @Query('from') from?: string,
        @Query('to') to?: string,
    ) {
        return this.followUpService.getReport(
            from ? new Date(from) : undefined,
            to ? new Date(to) : undefined,
        );
    }
}
