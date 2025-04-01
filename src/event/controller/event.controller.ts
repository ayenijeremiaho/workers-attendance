import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { CreateEventDto } from '../dto/create-event.dto';
import { EventService } from '../service/event.service';
import { EventDto } from '../dto/event.dto';
import { UpdateEventDto } from '../dto/update-event.dto';
import { PaginationResponseDto } from '../../utility/dto/pagination-response.dto';
import { UtilityService } from '../../utility/utility.service';
import { Event } from '../entity/event.entity';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { Roles } from '../../auth/decorator/roles.decorator';
import { UserTypeEnum } from '../../user/enums/user-type.enum';
import { OrderBy } from '../types/order-by.type';
import { Order } from '../types/order.type';

@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @UseGuards(RolesGuard)
  @Roles(UserTypeEnum.ADMIN)
  @Post()
  async create(@Body() createEventDto: CreateEventDto): Promise<EventDto> {
    const event = await this.eventService.create(createEventDto);
    return plainToInstance(EventDto, event);
  }

  @UseGuards(RolesGuard)
  @Roles(UserTypeEnum.ADMIN)
  @Put('/:id')
  async update(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
  ): Promise<EventDto> {
    const event = await this.eventService.update(id, updateEventDto);
    return plainToInstance(EventDto, event);
  }

  @Get('/:id')
  async get(@Param('id') id: string): Promise<EventDto> {
    const event = await this.eventService.get(id);
    return plainToInstance(EventDto, event);
  }

  @Get()
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('orderBy') orderBy?: OrderBy,
    @Query('order') order?: Order,
  ): Promise<PaginationResponseDto<EventDto>> {
    const events = await this.eventService.getAll(page, limit, orderBy, order);
    return UtilityService.getPaginationResponseDto<Event, EventDto>(
      events,
      EventDto,
    );
  }

  @UseGuards(RolesGuard)
  @Roles(UserTypeEnum.ADMIN)
  @Delete('/delete-future/:recurringEventId')
  async deleteFutureEvent(
    @Param('recurringEventId') recurringEventId: string,
  ): Promise<void> {
    await this.eventService.deleteFutureEvents(recurringEventId);
  }
}
