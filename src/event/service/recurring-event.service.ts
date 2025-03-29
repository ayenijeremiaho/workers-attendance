import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../entity/event.entity';
import { RecurringEvent } from '../entity/recurring-event.entity';
import { addDays, addWeeks, addMonths } from 'date-fns';
import { CreateRecurringEventDto } from '../dto/create-recurring-event.dto';

@Injectable()
export class RecurringEventService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(RecurringEvent)
    private readonly recurringEventRepository: Repository<RecurringEvent>,
  ) {}

  async createRecurringEvent(
    recurringEventDto: CreateRecurringEventDto,
  ): Promise<RecurringEvent> {
    if (!recurringEventDto.recurrenceEndDate) {
      throw new Error('recurrenceEndDate is required');
    }

    let recurringEvent: RecurringEvent =
      this.recurringEventRepository.create(recurringEventDto);
    recurringEvent = await this.recurringEventRepository.save(recurringEvent);

    const events = this.calculateRecurringEvents(recurringEvent);
    await this.eventRepository.save(events);

    return recurringEvent;
  }

  private calculateRecurringEvents(recurringEvent: RecurringEvent): Event[] {
    const events: Event[] = [];
    let currentDate = recurringEvent.recurrenceStartDate;

    while (currentDate <= recurringEvent.recurrenceEndDate) {
      const event = this.eventRepository.create({
        name: recurringEvent.name,
        description: recurringEvent.description,
        startDate: currentDate,
        endDate: new Date(
          currentDate.getTime() +
            (recurringEvent.endDate.getTime() -
              recurringEvent.startDate.getTime()),
        ),
        recurringEvent,
      });
      events.push(event);

      switch (recurringEvent.recurrencePattern) {
        case 'daily':
          currentDate = addDays(currentDate, recurringEvent.recurrenceInterval);
          break;
        case 'weekly':
          currentDate = addWeeks(
            currentDate,
            recurringEvent.recurrenceInterval,
          );
          break;
        case 'monthly':
          currentDate = addMonths(
            currentDate,
            recurringEvent.recurrenceInterval,
          );
          break;
      }
    }

    return events;
  }

  async deleteFutureEvents(recurringEventId: string): Promise<void> {
    const recurringEvent = await this.recurringEventRepository.findOne({
      where: { id: recurringEventId },
      relations: ['events'],
    });
    if (recurringEvent) {
      const futureEvents = recurringEvent.events.filter(
        (event) => event.startDate > new Date(),
      );
      await this.eventRepository.remove(futureEvents);
    }
  }
}
