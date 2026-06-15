import {BadRequestException, Injectable, NotFoundException} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {ServiceHeadcount} from '../entity/service-headcount.entity';
import {ServiceSlot} from '../../event/entity/service-slot.entity';
import {Admin} from '../../admin/entity/admin.entity';
import {CacheService} from '../../utility/service/cache.service';
import {CreateServiceHeadcountDto} from '../dto/create-service-headcount.dto';
import {UpdateServiceHeadcountDto} from '../dto/update-service-headcount.dto';
import {PaginationResponseDto} from '../../utility/dto/pagination-response.dto';

const TRENDS_TTL = 1800;

export interface HeadcountTotal {
    maleAdults: number;
    femaleAdults: number;
    teenagers: number;
    children: number;
    mobileChurch: number;
    customGroups: Record<string, number>;
    total: number;
}

export interface HeadcountTrendPoint {
    periodLabel: string;
    serviceSlotName: string;
    maleAdults: number;
    femaleAdults: number;
    teenagers: number;
    children: number;
    mobileChurch: number;
    customGroups: Record<string, number>;
    total: number;
}

export type HeadcountPeriod = 'weekly' | 'monthly' | 'quarterly';

export interface HeadcountTrendsResult {
    period: HeadcountPeriod;
    from: string | null;
    to: string | null;
    data: HeadcountTrendPoint[];
}

@Injectable()
export class ServiceHeadcountService {
    constructor(
        private readonly cacheService: CacheService,
        @InjectRepository(ServiceHeadcount)
        private readonly headcountRepo: Repository<ServiceHeadcount>,
        @InjectRepository(ServiceSlot)
        private readonly serviceSlotRepo: Repository<ServiceSlot>,
    ) {}

    async create(dto: CreateServiceHeadcountDto, admin: Admin): Promise<ServiceHeadcount & {total: number}> {
        const serviceSlot = await this.serviceSlotRepo.findOne({where: {id: dto.serviceSlotId}});
        if (!serviceSlot) throw new NotFoundException('Service slot not found');

        const record = this.headcountRepo.create({
            serviceSlot,
            maleAdults: dto.maleAdults ?? 0,
            femaleAdults: dto.femaleAdults ?? 0,
            teenagers: dto.teenagers ?? 0,
            children: dto.children ?? 0,
            mobileChurch: dto.mobileChurch ?? 0,
            customGroups: dto.customGroups ?? {},
            notes: dto.notes ?? null,
            recordedBy: admin,
        });
        const saved = await this.headcountRepo.save(record);
        this.cacheService.flushNamespace('headcount:trends');
        return Object.assign(saved, {total: this.computeTotal(saved)});
    }

    async update(id: string, dto: UpdateServiceHeadcountDto): Promise<ServiceHeadcount & {total: number}> {
        const record = await this.headcountRepo.findOne({where: {id}, relations: ['serviceSlot', 'recordedBy', 'recordedBy.member']});
        if (!record) throw new NotFoundException('Headcount record not found');

        if (dto.maleAdults !== undefined) record.maleAdults = dto.maleAdults;
        if (dto.femaleAdults !== undefined) record.femaleAdults = dto.femaleAdults;
        if (dto.teenagers !== undefined) record.teenagers = dto.teenagers;
        if (dto.children !== undefined) record.children = dto.children;
        if (dto.mobileChurch !== undefined) record.mobileChurch = dto.mobileChurch;
        if (dto.customGroups !== undefined) record.customGroups = dto.customGroups;
        if (dto.notes !== undefined) record.notes = dto.notes;

        const saved = await this.headcountRepo.save(record);
        this.cacheService.flushNamespace('headcount:trends');
        return Object.assign(saved, {total: this.computeTotal(saved)});
    }

    async findAll(
        page = 1,
        limit = 20,
        serviceSlotId?: string,
        from?: string,
        to?: string,
    ): Promise<PaginationResponseDto<ServiceHeadcount & {total: number}>> {
        if (page < 1) throw new BadRequestException('Page must be greater than 0');

        const qb = this.headcountRepo
            .createQueryBuilder('h')
            .innerJoinAndSelect('h.serviceSlot', 'slot')
            .leftJoinAndSelect('slot.event', 'event')
            .leftJoinAndSelect('h.recordedBy', 'admin')
            .leftJoinAndSelect('admin.member', 'member')
            .orderBy('slot.startTime', 'DESC');

        if (serviceSlotId) qb.andWhere('slot.id = :serviceSlotId', {serviceSlotId});
        if (from) qb.andWhere('slot.startTime >= :from', {from: new Date(from)});
        if (to) qb.andWhere('slot.startTime <= :to', {to: new Date(to)});

        const [raw, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
        const data = raw.map((r) => Object.assign(r, {total: this.computeTotal(r)}));

        return {data, page, limit, totalCount: total, totalPages: Math.ceil(total / limit)};
    }

    async findOne(id: string): Promise<ServiceHeadcount & {total: number}> {
        const record = await this.headcountRepo.findOne({
            where: {id},
            relations: ['serviceSlot', 'serviceSlot.event', 'recordedBy', 'recordedBy.member'],
        });
        if (!record) throw new NotFoundException('Headcount record not found');
        return Object.assign(record, {total: this.computeTotal(record)});
    }

    async getTrends(
        period: HeadcountPeriod = 'weekly',
        from?: string,
        to?: string,
        serviceSlotName?: string,
    ): Promise<HeadcountTrendsResult> {
        const key = `headcount:trends:${period}:${from ?? 'all'}:${to ?? 'all'}:${serviceSlotName ?? 'all'}`;
        return this.cacheService.getOrSet(key, () => this.fetchTrends(period, from, to, serviceSlotName), TRENDS_TTL);
    }

    private async fetchTrends(
        period: HeadcountPeriod,
        from?: string,
        to?: string,
        serviceSlotName?: string,
    ): Promise<HeadcountTrendsResult> {
        const qb = this.headcountRepo
            .createQueryBuilder('h')
            .innerJoinAndSelect('h.serviceSlot', 'slot')
            .orderBy('slot.startTime', 'ASC');

        if (from) qb.andWhere('slot.startTime >= :from', {from: new Date(from)});
        if (to) qb.andWhere('slot.startTime <= :to', {to: new Date(to)});
        if (serviceSlotName) qb.andWhere('slot.name ILIKE :name', {name: `%${serviceSlotName}%`});

        const records = await qb.getMany();

        const bucketMap = new Map<string, HeadcountTrendPoint>();

        for (const r of records) {
            const label = this.periodLabel(r.serviceSlot.startTime, period);
            const key = `${label}::${r.serviceSlot.name}`;

            let point = bucketMap.get(key);
            if (!point) {
                point = {
                    periodLabel: label,
                    serviceSlotName: r.serviceSlot.name,
                    maleAdults: 0,
                    femaleAdults: 0,
                    teenagers: 0,
                    children: 0,
                    mobileChurch: 0,
                    customGroups: {},
                    total: 0,
                };
                bucketMap.set(key, point);
            }

            point.maleAdults += r.maleAdults;
            point.femaleAdults += r.femaleAdults;
            point.teenagers += r.teenagers;
            point.children += r.children;
            point.mobileChurch += r.mobileChurch;

            for (const [group, count] of Object.entries(r.customGroups ?? {})) {
                point.customGroups[group] = (point.customGroups[group] ?? 0) + count;
            }

            point.total += this.computeTotal(r);
        }

        return {
            period,
            from: from ?? null,
            to: to ?? null,
            data: Array.from(bucketMap.values()),
        };
    }

    private computeTotal(r: ServiceHeadcount): number {
        const fixedTotal = r.maleAdults + r.femaleAdults + r.teenagers + r.children + r.mobileChurch;
        const customTotal = Object.values(r.customGroups ?? {}).reduce((sum, n) => sum + n, 0);
        return fixedTotal + customTotal;
    }

    private periodLabel(date: Date, period: HeadcountPeriod): string {
        const d = new Date(date);
        if (period === 'weekly') {
            const day = d.getDay();
            const sunday = new Date(d);
            sunday.setDate(d.getDate() - day);
            return sunday.toISOString().slice(0, 10);
        }
        if (period === 'monthly') {
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        }
        const quarter = Math.floor(d.getMonth() / 3) + 1;
        return `${d.getFullYear()}-Q${quarter}`;
    }
}
