import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { EventReminderService } from '../service/event-reminder.service';
import {
  CreateEventReminderDto,
  UpdateEventReminderDto,
} from '../dto/event-reminder.dto';
import { AdminGuard } from '../../admin/guard/admin.guard';
import { RequiresPermission } from '../../admin/decorator/requires-permission.decorator';
import { AdminPermission } from '../../admin/enum/admin-permission.enum';

@UseGuards(AdminGuard)
@RequiresPermission(AdminPermission.EVENTS_WRITE)
@Controller('events/slots/:slotId/reminders')
export class EventReminderController {
  constructor(private readonly reminderService: EventReminderService) {}

  @Post()
  create(
    @Param('slotId', ParseUUIDPipe) slotId: string,
    @Body() dto: CreateEventReminderDto,
  ) {
    return this.reminderService.create(slotId, dto);
  }

  @Get()
  findAll(@Param('slotId', ParseUUIDPipe) slotId: string) {
    return this.reminderService.findForSlot(slotId);
  }

  @Patch(':reminderId')
  update(
    @Param('reminderId', ParseUUIDPipe) reminderId: string,
    @Body() dto: UpdateEventReminderDto,
  ) {
    return this.reminderService.update(reminderId, dto);
  }

  @Delete(':reminderId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('reminderId', ParseUUIDPipe) reminderId: string) {
    return this.reminderService.remove(reminderId);
  }
}
