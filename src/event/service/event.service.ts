import {BadRequestException, Injectable, NotFoundException,} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {DataSource, MoreThanOrEqual, Repository} from 'typeorm';
import {Event} from '../entity/event.entity';
import {ServiceSlot} from '../entity/service-slot.entity';
import {EventConfig} from '../entity/event-config.entity';
import {Venue} from '../../venue/entity/venue.entity';
import {addDays, addMonths, addWeeks} from 'date-fns';
import {v4 as uuidv4} from 'uuid';
import {CreateEventDto} from '../dto/create-event.dto';
import {CreateServiceSlotDto} from '../dto/create-service-slot.dto';
import {PaginationResponseDto} from '../../utility/dto/pagination-response.dto';
import {UtilityService} from '../../utility/service/utility.service';
import {AuditLogService} from '../../utility/service/audit-log.service';
import {EventConfigService} from './event-config.service';
import {VenueService} from '../../venue/service/venue.service';
import {OrderBy} from '../types/order-by.type';
import {Order} from '../types/order.type';

const SLOT_RELATIONS = [
    'serviceSlots',
    'serviceSlots.config',
    'serviceSlots.config.defaultVenue',
    'serviceSlots.venueOverride',
];

@Injectable()
export class EventService {
    constructor(
        private readonly dataSource: DataSource,
        private readonly eventConfigService: EventConfigService,
        private readonly venueService: VenueService,
        private readonly auditLogService: AuditLogService,
        @InjectRepository(Event)
        private readonly eventRepository: Repository<Event>,
        @InjectRepository(ServiceSlot)
        private readonly slotRepository: Repository<ServiceSlot>,
    ) {
    }

    async create(dto: CreateEventDto, actorId: string): Promise<Event | Event[]> {
        const eventDate = new Date(dto.eventDate);
        if (Number.isNaN(eventDate.getTime())) throw new BadRequestException('Invalid eventDate');

        if (dto.isRecurring) {
            if (!dto.recurrence) throw new BadRequestException('Recurrence details required for recurring events');
            const result = await this.createRecurring(dto, eventDate);
            this.auditLogService.log('EVENT_CREATED', {
                actorId,
                metadata: {name: dto.name, isRecurring: true, count: result.length},
            });
            return result;
        }

        const result = await this.createSingle(dto, eventDate);
        this.auditLogService.log('EVENT_CREATED', {
            actorId,
            targetId: result.id,
            metadata: {name: result.name, eventDate: dto.eventDate},
        });
        return result;
    }

    async update(id: string, dto: Partial<CreateEventDto>, actorId: string): Promise<Event> {
        const event = await this.getById(id);

        if (dto.name) event.name = dto.name;
        if (dto.description !== undefined) event.description = dto.description;
        if (dto.eventDate) {
            const d = new Date(dto.eventDate);
            if (Number.isNaN(d.getTime())) throw new BadRequestException('Invalid eventDate');
            event.eventDate = d;
        }

        if (dto.serviceSlots?.length) {
            await this.slotRepository.delete({event: {id}});
            event.serviceSlots = await this.buildSlots(dto.serviceSlots);
        }

        const saved = await this.eventRepository.save(event);
        this.auditLogService.log('EVENT_UPDATED', {
            actorId,
            targetId: id,
            metadata: {name: saved.name, changes: Object.keys(dto)},
        });
        return saved;
    }

    async getById(id: string, memberId?: string): Promise<Event> {
        const event = await this.eventRepository.findOne({
            where: {id},
            relations: SLOT_RELATIONS,
        });
        if (!event) throw new NotFoundException('Event not found');
        if (memberId) await this.attachMyAttendance([event], memberId);
        return event;
    }

    async getAll(
        page = 1,
        limit = 10,
        orderBy: OrderBy = 'eventDate',
        order: Order = 'DESC',
        memberId?: string,
    ): Promise<PaginationResponseDto<Event>> {
        if (page < 1) throw new BadRequestException('Page must be greater than 0');

        const [events, total] = await this.eventRepository.findAndCount({
            skip: (page - 1) * limit,
            take: limit,
            order: {[orderBy]: order},
            relations: SLOT_RELATIONS,
        });

        if (memberId && events.length) await this.attachMyAttendance(events, memberId);

        return UtilityService.createPaginationResponse(events, page, limit, total);
    }

    async deleteEvent(eventId: string, actorId: string): Promise<void> {
        const event = await this.eventRepository.findOne({
            where: {id: eventId},
            relations: ['serviceSlots'],
        });

        if (!event) throw new NotFoundException('Event not found');

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const eventDay = new Date(event.eventDate);
        eventDay.setHours(0, 0, 0, 0);

        if (eventDay < today) throw new BadRequestException('Past events cannot be deleted');

        const {name} = event;
        await this.eventRepository.remove(event);
        this.auditLogService.log('EVENT_DELETED', {
            actorId,
            targetId: eventId,
            metadata: {name},
        });
    }

    async deleteFutureRecurring(recurringEventId: string, actorId: string): Promise<void> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const events = await this.eventRepository
            .createQueryBuilder('event')
            .where('event.recurringEventId = :recurringEventId', {recurringEventId})
            .andWhere('event.eventDate >= :today', {today})
            .getMany();

        if (!events.length) throw new NotFoundException('No future recurring events found');

        const name = events[0]?.name;
        await this.eventRepository.remove(events);
        this.auditLogService.log('EVENT_DELETED', {
            actorId,
            metadata: {name, recurringEventId, count: events.length, isRecurring: true},
        });
    }

    async findSlotsNotMarkedAbsent(): Promise<ServiceSlot[]> {
        const now = new Date();
        return this.slotRepository
            .createQueryBuilder('slot')
            .leftJoinAndSelect('slot.config', 'config')
            .leftJoinAndSelect('config.defaultVenue', 'defaultVenue')
            .leftJoinAndSelect('slot.venueOverride', 'venueOverride')
            .leftJoinAndSelect('slot.event', 'event')
            .where('slot.markedAbsent = false')
            .andWhere('slot.endTime < :now', {now})
            .getMany();
    }

    async getUpcomingEvents(limit = 5): Promise<Event[]> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return this.eventRepository.find({
            where: {eventDate: MoreThanOrEqual(today)},
            order: {eventDate: 'ASC'},
            take: limit,
            relations: ['serviceSlots', 'serviceSlots.config', 'serviceSlots.config.defaultVenue', 'serviceSlots.venueOverride'],
        });
    }

    async markSlotAbsent(slotId: string): Promise<void> {
        await this.slotRepository.update(slotId, {markedAbsent: true});
    }

    resolveSlotConfig(slot: ServiceSlot): {
        workerCheckinStartOffsetSeconds: number;
        workerLateOffsetSeconds: number;
        memberCheckinStartOffsetSeconds: number;
        checkinStopOffsetSeconds: number;
        venue: Venue;
        allowedDistanceInMeters: number;
    } {
        const c = slot.config;
        if (!c) throw new BadRequestException(`Service slot "${slot.name}" has no config`);

        const venue = slot.venueOverride ?? c.defaultVenue;
        if (!venue) throw new BadRequestException(`Service slot "${slot.name}" has no venue configured`);

        return {
            workerCheckinStartOffsetSeconds: slot.workerCheckinStartOverride ?? c.workerCheckinStartOffsetSeconds,
            workerLateOffsetSeconds: slot.workerLateOverride ?? c.workerLateOffsetSeconds,
            memberCheckinStartOffsetSeconds: slot.memberCheckinStartOverride ?? c.memberCheckinStartOffsetSeconds,
            checkinStopOffsetSeconds: slot.checkinStopOverride ?? c.checkinStopOffsetSeconds,
            venue,
            allowedDistanceInMeters: slot.allowedDistanceOverride ?? c.allowedDistanceInMeters,
        };
    }

    private async createSingle(dto: CreateEventDto, eventDate: Date): Promise<Event> {
        const event = this.eventRepository.create({
            name: dto.name,
            description: dto.description,
            eventDate,
        });

        event.serviceSlots = await this.buildSlots(dto.serviceSlots);
        return this.eventRepository.save(event);
    }

    private async createRecurring(dto: CreateEventDto, firstDate: Date): Promise<Event[]> {
        const recurrenceEndDate = new Date(dto.recurrence.recurrenceEndDate);
        if (Number.isNaN(recurrenceEndDate.getTime())) throw new BadRequestException('Invalid recurrenceEndDate');

        const oneYearLater = new Date(firstDate);
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
        if (recurrenceEndDate > oneYearLater) {
            throw new BadRequestException('Recurrence end date must be within one year of event start');
        }

        const recurringEventId = uuidv4();
        const events: Event[] = [];
        let currentDate = firstDate;

        while (currentDate <= recurrenceEndDate) {
            const event = this.eventRepository.create({
                name: dto.name,
                description: dto.description,
                eventDate: new Date(currentDate),
                recurringEventId,
            });

            event.serviceSlots = await this.buildSlots(dto.serviceSlots);
            events.push(event);

            currentDate = this.advanceDate(currentDate, dto.recurrence.recurrencePattern, dto.recurrence.recurrenceInterval);
        }

        return this.eventRepository.save(events);
    }

    private async buildSlots(slotDtos: CreateServiceSlotDto[]): Promise<ServiceSlot[]> {
        return Promise.all(slotDtos.map((dto) => this.buildSlotFromDto(dto)));
    }

    private async buildSlotFromDto(dto: CreateServiceSlotDto): Promise<ServiceSlot> {
        const start = new Date(dto.startTime);
        const end = new Date(dto.endTime);

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            throw new BadRequestException('Invalid slot startTime or endTime');
        }
        if (start >= end) {
            throw new BadRequestException(`Slot "${dto.name ?? 'Service'}" startTime must be before endTime`);
        }

        let config: EventConfig | undefined;
        if (dto.configId) {
            config = await this.eventConfigService.get(dto.configId);
        }

        let venueOverride: Venue | null = null;
        if (dto.venueOverrideId) {
            venueOverride = await this.venueService.getById(dto.venueOverrideId);
        }

        return this.slotRepository.create({
            name: dto.name ?? 'Service',
            startTime: start,
            endTime: end,
            config,
            workerCheckinStartOverride: dto.workerCheckinStartOverride ?? null,
            workerLateOverride: dto.workerLateOverride ?? null,
            memberCheckinStartOverride: dto.memberCheckinStartOverride ?? null,
            checkinStopOverride: dto.checkinStopOverride ?? null,
            allowedDistanceOverride: dto.allowedDistanceOverride ?? null,
            venueOverride,
        });
    }

    private async attachMyAttendance(events: Event[], memberId: string): Promise<void> {
        const allSlots = events.flatMap((e) => e.serviceSlots ?? []);
        if (!allSlots.length) return;

        const slotIds = allSlots.map((s) => s.id);
        const rows = await this.dataSource
            .createQueryBuilder()
            .select('a.service_slot_id', 'slotId')
            .addSelect('a.status', 'status')
            .addSelect('a.checkin_time', 'checkinTime')
            .from('attendances', 'a')
            .where('a.member_id = :memberId', {memberId})
            .andWhere('a.service_slot_id IN (:...slotIds)', {slotIds})
            .getRawMany<{ slotId: string; status: string; checkinTime: Date | null }>();

        const bySlotId = new Map(rows.map((r) => [r.slotId, r]));

        for (const event of events) {
            const slots = event.serviceSlots ?? [];
            const rec = slots.map((s) => bySlotId.get(s.id)).find(Boolean);
            event.checkedIn = !!rec;
            event.myCheckin = rec
                ? {
                    slotId: rec.slotId,
                    slotName: slots.find((s) => s.id === rec.slotId)?.name ?? null,
                    status: rec.status,
                    checkinTime: rec.checkinTime
                }
                : null;
        }
    }

    private advanceDate(date: Date, pattern: string, interval: number): Date {
        switch (pattern) {
            case 'daily':
                return addDays(date, interval);
            case 'weekly':
                return addWeeks(date, interval);
            case 'monthly':
                return addMonths(date, interval);
            default:
                throw new BadRequestException(`Unknown recurrence pattern: ${pattern}`);
        }
    }
}
