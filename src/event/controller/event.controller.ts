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
  UseGuards,
} from '@nestjs/common';
import { EventService } from '../service/event.service';
import { CreateEventDto } from '../dto/create-event.dto';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { Roles } from '../../auth/decorator/roles.decorator';
import { MemberRoleEnum } from '../../member/enums/member-role.enum';
import { OrderBy } from '../types/order-by.type';
import { Order } from '../types/order.type';

@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @UseGuards(RolesGuard)
  @Roles(MemberRoleEnum.ADMIN)
  @Post()
  async create(@Body() dto: CreateEventDto) {
    return this.eventService.create(dto);
  }

  @UseGuards(RolesGuard)
  @Roles(MemberRoleEnum.ADMIN)
  @Patch(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<CreateEventDto>) {
    return this.eventService.update(id, dto);
  }

  @Get(':id')
  async getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventService.getById(id);
  }

  @Get()
  async getAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('orderBy') orderBy?: OrderBy,
    @Query('order') order?: Order,
  ) {
    return this.eventService.getAll(+page, +limit, orderBy, order);
  }

  @UseGuards(RolesGuard)
  @Roles(MemberRoleEnum.ADMIN)
  @Delete('recurring/:recurringEventId')
  async deleteFutureRecurring(@Param('recurringEventId') recurringEventId: string) {
    await this.eventService.deleteFutureRecurring(recurringEventId);
  }

  @UseGuards(RolesGuard)
  @Roles(MemberRoleEnum.ADMIN)
  @Delete(':id')
  async deleteEvent(@Param('id', ParseUUIDPipe) id: string) {
    await this.eventService.deleteEvent(id);
  }
}
