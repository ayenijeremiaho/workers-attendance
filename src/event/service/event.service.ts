import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  LessThan,
  LessThanOrEqual,
  MoreThan,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { Event } from '../entity/event.entity';
import { addDays, addMonths, addWeeks, format } from 'date-fns';
import { CreateEventDto } from '../dto/create-event.dto';
import { v4 as uuidv4 } from 'uuid';
import { UpdateEventDto } from '../dto/update-event.dto';
import { PaginationResponseDto } from '../../utility/dto/pagination-response.dto';
import { UtilityService } from '../../utility/service/utility.service';
import { EventConfigService } from './event-config.service';
import { EventConfig } from '../entity/event-config.entity';
import { OrderBy } from '../types/order-by.type';
import { Order } from '../types/order.type';

@Injectable()
export class EventService {
  constructor(
    private readonly eventConfigService: EventConfigService,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
  ) {}

  async create(createEventDto: CreateEventDto): Promise<Event | Event[]> {
    const { startEvent, endEvent, isRecurring, recurrence } = createEventDto;

    const eventConfig = await this.eventConfigService.get(
      createEventDto.eventConfigId,
    );

    const startDate = new Date(startEvent);
    const endDate = new Date(endEvent);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    if (startDate.getTime() < new Date().getTime()) {
      throw new BadRequestException('Event start date must be in the future');
    }

    if (startDate.getTime() > endDate.getTime()) {
      throw new BadRequestException(
        'Invalid date format, event start date should be before event end date',
      );
    }

    await this.checkForOverlappingEvents(startDate, endDate);

    if (isRecurring && !recurrence) {
      throw new BadRequestException(
        'Recurrence details must be provided for recurring events',
      );
    }

    if (isRecurring) {
      const recurrenceEndDate = new Date(recurrence.recurrenceEndDate);
      if (isNaN(recurrenceEndDate.getDate())) {
        throw new BadRequestException('Invalid recurrence end date format');
      }

      if (endDate.getTime() > recurrenceEndDate.getTime()) {
        throw new BadRequestException(
          'Recurring event end date must be after event end date',
        );
      }

      const events = this.calculateRecurringEvents(
        startDate,
        endDate,
        recurrenceEndDate,
        createEventDto,
        eventConfig,
      );

      for (const event of events) {
        await this.checkForOverlappingEvents(event.startDate, event.endDate);
      }

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
        throw new BadRequestException('Invalid event end date format');
      }

      event.endDate = newEndDate;
    }

    if (updateEventDto.startEvent) {
      const newStartDate = new Date(updateEventDto.startEvent);

      if (isNaN(newStartDate.getTime())) {
        throw new BadRequestException('Invalid event start date format');
      }

      event.startDate = newStartDate;
    }

    if (event.startDate.getTime() < new Date().getTime()) {
      throw new BadRequestException('Event start date must be in the future');
    }

    if (event.startDate.getTime() > event.endDate.getTime()) {
      throw new BadRequestException(
        'Invalid date format, event start date should be before event end date',
      );
    }

    await this.checkForOverlappingEvents(event.startDate, event.endDate, id);

    return this.eventRepository.save(event);
  }

  async get(id: string): Promise<Event> {
    const event = await this.eventRepository.findOne({
      where: { id },
      relations: { eventConfig: true },
    });

    if (!event) {
      throw new NotFoundException('Event does not exist');
    }

    return event;
  }

  public async getAll(
    page: number = 1,
    limit: number = 10,
    orderBy: OrderBy = 'startDate',
    order: Order = 'DESC',
  ): Promise<PaginationResponseDto<Event>> {
    if (page < 1) {
      throw new BadRequestException('Page number must be greater than 0');
    }

    const [events, total] = await this.eventRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { [orderBy]: order },
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

  async findByAbsenteesNotUpdated() {
    const currentTime = new Date();

    return await this.eventRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.eventConfig', 'eventConfig')
      .where(
        new Brackets((qb) => {
          qb.where('event.endDate < :currentTime', { currentTime }).orWhere(
            `event.startDate + INTERVAL '1 second' * eventConfig.lateComingStartTimeInSeconds < :currentTime`,
            { currentTime },
          );
        }),
      )
      .andWhere('event.markedAbsent = false')
      .getMany();
  }

  async updateEvent(event: Event): Promise<Event> {
    return this.eventRepository.save(event);
  }

  async getTopEventsByDateCondition(
    condition: 'gte' | 'gt' | 'lte' | 'lt',
    date: Date = new Date(),
    limit: number = 5,
  ): Promise<Event[]> {
    const operators = {
      gte: MoreThanOrEqual,
      gt: MoreThan,
      lte: LessThanOrEqual,
      lt: LessThan,
    };

    const operatorFn = operators[condition];

    if (!operatorFn) {
      throw new BadRequestException('Invalid date condition');
    }

    return this.eventRepository.find({
      where: { startDate: operatorFn(date) },
      order: { startDate: 'ASC' },
      take: limit,
    });
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
        'Recurrence end date must be within one year of event start date',
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

  private async checkForOverlappingEvents(
    startDate: Date,
    endDate: Date,
    eventId?: string,
  ): Promise<void> {
    const overlappingEvents = await this.eventRepository
      .createQueryBuilder('event')
      .where('event.id != :eventId', { eventId })
      .andWhere(
        '(event.startDate < :endDate AND event.endDate > :startDate) OR ' +
          '(event.startDate = :startDate AND event.endDate = :endDate)',
        { startDate, endDate },
      )
      .getMany();

    if (overlappingEvents.length > 0) {
      const formattedStartDate = format(startDate, 'yyyy-MM-dd HH:mm');
      const formattedEndDate = format(endDate, 'yyyy-MM-dd HH:mm');
      throw new BadRequestException(
        `An event already exists within the specified time range: ${formattedStartDate} to ${formattedEndDate}`,
      );
    }
  }
}
