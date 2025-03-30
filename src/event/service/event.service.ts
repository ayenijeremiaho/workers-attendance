import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { Event } from '../entity/event.entity';
import { addDays, addMonths, addWeeks } from 'date-fns';
import { CreateEventDto } from '../dto/create-event.dto';
import { v4 as uuidv4 } from 'uuid';
import { UpdateEventDto } from '../dto/update-event.dto';
import { PaginationResponseDto } from '../../utility/dto/pagination-response.dto';
import { UtilityService } from '../../utility/utility.service';
import { EventConfigService } from './event-config.service';
import { EventConfig } from '../entity/event-config.entity';

@Injectable()
export class EventService {
  constructor(
    private readonly eventConfigService: EventConfigService,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
  ) {}

  async create(createEventDto: CreateEventDto): Promise<Event | Event[]> {
    const { startEvent, endEvent, isRecurring, recurrence } = createEventDto;

    let eventConfig = null;
    if (createEventDto.eventConfigId) {
      eventConfig = this.eventConfigService.get(createEventDto.eventConfigId);
    }

    const startDate = new Date(startEvent);
    const endDate = new Date(endEvent);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    if (startDate.getTime() > endDate.getTime()) {
      throw new BadRequestException(
        'Invalid date format, startDate should be before endDate',
      );
    }

    if (isRecurring && !recurrence) {
      throw new BadRequestException(
        'Recurrence details must be provided for recurring events',
      );
    }

    if (isRecurring) {
      const recurrenceEndDate = new Date(endEvent);
      if (isNaN(recurrenceEndDate.getDate())) {
        throw new BadRequestException('Invalid recurrenceEndDate format');
      }

      if (endDate.getTime() > recurrenceEndDate.getTime()) {
        throw new BadRequestException(
          'Recurring event endDate must be before event end date',
        );
      }

      const events = this.calculateRecurringEvents(
        startDate,
        endDate,
        recurrenceEndDate,
        createEventDto,
        eventConfig,
      );
      return this.eventRepository.save(events);
    }

    const event = this.eventRepository.create({
      ...createEventDto,
      startDate: startDate,
      endDate: endDate,
      eventConfig,
    });

    return this.eventRepository.save(event);
  }

  async update(id: string, updateEventDto: UpdateEventDto) {
    const event = await this.get(id);

    if (updateEventDto.name && event.name !== updateEventDto.name) {
      event.name = updateEventDto.name;
    }

    if (
      updateEventDto.description &&
      event.description !== updateEventDto.description
    ) {
      event.description = updateEventDto.description;
    }

    let eventConfig = event.eventConfig;
    if (
      updateEventDto.eventConfigId &&
      event.eventConfig?.id !== updateEventDto.eventConfigId
    ) {
      eventConfig = await this.eventConfigService.get(
        updateEventDto.eventConfigId,
      );
      event.eventConfig = eventConfig;
    }

    if (updateEventDto.endEvent) {
      const newEndDate = new Date(updateEventDto.endEvent);

      if (isNaN(newEndDate.getTime())) {
        throw new BadRequestException('Invalid end event date format');
      }

      event.endDate = newEndDate;
    }

    if (updateEventDto.startEvent) {
      const newStartDate = new Date(updateEventDto.startEvent);

      if (isNaN(newStartDate.getTime())) {
        throw new BadRequestException('Invalid start event date format');
      }

      if (newStartDate.getTime() > event.endDate.getTime()) {
        throw new BadRequestException(
          'Invalid date format, startDate should be before endDate',
        );
      }
    }

    if (updateEventDto.endEvent) {
      event.endDate = new Date(updateEventDto.endEvent);
    }

    return this.eventRepository.save(event);
  }

  async get(id: string): Promise<Event> {
    const event = await this.eventRepository.findOne({
      where: { id },
    });

    if (!event) {
      throw new NotFoundException('Event does not exist');
    }

    return event;
  }

  public async getAll(
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginationResponseDto<Event>> {
    if (page < 1) {
      throw new BadRequestException('Page number must be greater than 0');
    }

    const [events, total] = await this.eventRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return UtilityService.createPaginationResponse<Event>(
      events,
      page,
      limit,
      total,
    );
  }

  async deleteFutureEvents(recurringEventId: string): Promise<void> {
    const futureEvents = await this.eventRepository.find({
      where: { recurringEventId, startDate: MoreThanOrEqual(new Date()) },
    });

    if (futureEvents) {
      await this.eventRepository.remove(futureEvents);
    } else {
      throw new NotFoundException('No future events found');
    }
  }

  private calculateRecurringEvents(
    startDate: Date,
    endDate: Date,
    recurrenceEndDate: Date,
    recurringEvent: CreateEventDto,
    eventConfig: EventConfig | null,
  ): Event[] {
    const oneYearLater = new Date(startDate);
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

    if (recurrenceEndDate > oneYearLater) {
      throw new BadRequestException(
        'recurrenceEndDate must be within one year of startDate',
      );
    }

    const events: Event[] = [];
    let currentDate = startDate;
    const recurringEventId = uuidv4();

    while (currentDate <= recurrenceEndDate) {
      const eventEndDate = new Date(
        currentDate.getTime() + (endDate.getTime() - startDate.getTime()),
      );

      const event = this.eventRepository.create({
        name: recurringEvent.name,
        description: recurringEvent.description,
        startDate: currentDate,
        endDate: eventEndDate,
        recurringEventId,
        eventConfig,
      });
      events.push(event);

      switch (recurringEvent.recurrence.recurrencePattern) {
        case 'daily':
          currentDate = addDays(
            currentDate,
            recurringEvent.recurrence.recurrenceInterval,
          );
          break;
        case 'weekly':
          currentDate = addWeeks(
            currentDate,
            recurringEvent.recurrence.recurrenceInterval,
          );
          break;
        case 'monthly':
          currentDate = addMonths(
            currentDate,
            recurringEvent.recurrence.recurrenceInterval,
          );
          break;
      }
    }

    return events;
  }
}
