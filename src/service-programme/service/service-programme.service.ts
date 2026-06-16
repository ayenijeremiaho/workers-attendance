import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {DataSource, Repository} from 'typeorm';
import {ServiceProgramme} from '../entity/service-programme.entity';
import {ServiceProgrammeSlot} from '../entity/service-programme-slot.entity';
import {ServiceProgrammeTemplate, TemplateProgrammeSlot} from '../entity/service-programme-template.entity';
import {ServiceSlot} from '../../event/entity/service-slot.entity';
import {Member} from '../../member/entity/member.entity';
import {Admin} from '../../admin/entity/admin.entity';
import {CreateServiceProgrammeDto} from '../dto/create-service-programme.dto';
import {UpdateServiceProgrammeDto} from '../dto/update-service-programme.dto';
import {CreateServiceProgrammeSlotDto} from '../dto/create-service-programme-slot.dto';
import {UpdateServiceProgrammeSlotDto} from '../dto/update-service-programme-slot.dto';
import {ReorderProgrammeSlotsDto} from '../dto/reorder-programme-slots.dto';
import {ServiceProgrammeStatusEnum} from '../enum/service-programme-status.enum';
import {PaginationResponseDto} from '../../utility/dto/pagination-response.dto';
import {UtilityService} from '../../utility/service/utility.service';
import {PdfService} from '../../utility/service/pdf.service';

@Injectable()
export class ServiceProgrammeService {
    constructor(
        private readonly dataSource: DataSource,
        @InjectRepository(ServiceProgramme)
        private readonly programmeRepo: Repository<ServiceProgramme>,
        @InjectRepository(ServiceProgrammeSlot)
        private readonly slotRepo: Repository<ServiceProgrammeSlot>,
        @InjectRepository(ServiceProgrammeTemplate)
        private readonly templateRepo: Repository<ServiceProgrammeTemplate>,
        @InjectRepository(ServiceSlot)
        private readonly serviceSlotRepo: Repository<ServiceSlot>,
        @InjectRepository(Member)
        private readonly memberRepo: Repository<Member>,
        private readonly pdfService: PdfService,
    ) {}

    private readonly logger = new Logger(ServiceProgrammeService.name);

    async create(dto: CreateServiceProgrammeDto, admin: Admin): Promise<ServiceProgramme> {
        const serviceSlot = await this.serviceSlotRepo.findOne({where: {id: dto.serviceSlotId}});
        if (!serviceSlot) throw new NotFoundException('Service slot not found');

        const existing = await this.programmeRepo.findOne({where: {serviceSlot: {id: dto.serviceSlotId}}});
        if (existing) throw new ConflictException('A programme already exists for this service slot');

        const programme = this.programmeRepo.create({
            serviceSlot,
            saveAsTemplate: dto.saveAsTemplate ?? false,
            createdByAdmin: admin,
        });
        const saved = await this.programmeRepo.save(programme);
        this.logger.log(`Programme ${saved.id} created for slot ${dto.serviceSlotId} by admin ${admin.id}`);
        return saved;
    }

    async findAll(page = 1, limit = 20): Promise<PaginationResponseDto<ServiceProgramme>> {
        if (page < 1) throw new BadRequestException('Page must be greater than 0');

        const [data, total] = await this.programmeRepo.findAndCount({
            relations: ['serviceSlot', 'serviceSlot.event', 'createdByAdmin', 'createdByAdmin.member'],
            order: {createdAt: 'DESC'},
            skip: (page - 1) * limit,
            take: limit,
        });
        return UtilityService.createPaginationResponse(data, page, limit, total);
    }

    async findOne(id: string): Promise<ServiceProgramme> {
        const programme = await this.programmeRepo.findOne({
            where: {id},
            relations: [
                'serviceSlot',
                'serviceSlot.event',
                'createdByAdmin',
                'createdByAdmin.member',
                'slots',
                'slots.member',
                'slots.backupMember',
            ],
            order: {slots: {position: 'ASC'}},
        });
        if (!programme) throw new NotFoundException('Programme not found');
        return programme;
    }

    async update(id: string, dto: UpdateServiceProgrammeDto): Promise<ServiceProgramme> {
        const programme = await this.programmeRepo.findOne({where: {id}});
        if (!programme) throw new NotFoundException('Programme not found');
        Object.assign(programme, dto);
        const saved = await this.programmeRepo.save(programme);
        this.logger.log(`Programme ${id} updated`);
        return saved;
    }

    async remove(id: string): Promise<void> {
        const programme = await this.programmeRepo.findOne({where: {id}});
        if (!programme) throw new NotFoundException('Programme not found');
        if (programme.status !== ServiceProgrammeStatusEnum.DRAFT) {
            throw new BadRequestException('Only DRAFT programmes can be deleted');
        }
        await this.programmeRepo.remove(programme);
        this.logger.log(`Programme ${id} deleted`);
    }

    async addSlot(programmeId: string, dto: CreateServiceProgrammeSlotDto): Promise<ServiceProgrammeSlot> {
        const programme = await this.programmeRepo.findOne({
            where: {id: programmeId},
            relations: ['slots'],
        });
        if (!programme) throw new NotFoundException('Programme not found');
        if (programme.status !== ServiceProgrammeStatusEnum.DRAFT) {
            throw new BadRequestException('Slots can only be added to DRAFT programmes');
        }

        const nextPosition = programme.slots.length > 0
            ? Math.max(...programme.slots.map((s) => s.position)) + 1
            : 0;

        const member = dto.memberId
            ? await this.memberRepo.findOne({where: {id: dto.memberId}})
            : null;
        if (dto.memberId && !member) throw new NotFoundException('Member not found');

        const backupMember = dto.backupMemberId
            ? await this.memberRepo.findOne({where: {id: dto.backupMemberId}})
            : null;
        if (dto.backupMemberId && !backupMember) throw new NotFoundException('Backup member not found');

        const slot = this.slotRepo.create({
            programme,
            position: nextPosition,
            type: dto.type,
            topic: dto.topic ?? null,
            member: member ?? null,
            guestName: dto.guestName ?? null,
            backupMember: backupMember ?? null,
            backupGuestName: dto.backupGuestName ?? null,
            allocatedMinutes: dto.allocatedMinutes,
        });
        const saved = await this.slotRepo.save(slot);
        this.logger.log(`Slot added to programme ${programmeId} at position ${nextPosition}`);
        return saved;
    }

    async updateSlot(programmeId: string, slotId: string, dto: UpdateServiceProgrammeSlotDto): Promise<ServiceProgrammeSlot> {
        const slot = await this.slotRepo.findOne({
            where: {id: slotId, programme: {id: programmeId}},
            relations: ['programme', 'member', 'backupMember'],
        });
        if (!slot) throw new NotFoundException('Slot not found');
        if (slot.programme.status !== ServiceProgrammeStatusEnum.DRAFT) {
            throw new BadRequestException('Slots can only be edited on DRAFT programmes');
        }

        if (dto.memberId !== undefined) {
            slot.member = dto.memberId
                ? await this.memberRepo.findOne({where: {id: dto.memberId}})
                : null;
        }
        if (dto.backupMemberId !== undefined) {
            slot.backupMember = dto.backupMemberId
                ? await this.memberRepo.findOne({where: {id: dto.backupMemberId}})
                : null;
        }

        if (dto.type !== undefined) slot.type = dto.type;
        if (dto.topic !== undefined) slot.topic = dto.topic ?? null;
        if (dto.guestName !== undefined) slot.guestName = dto.guestName ?? null;
        if (dto.backupGuestName !== undefined) slot.backupGuestName = dto.backupGuestName ?? null;
        if (dto.allocatedMinutes !== undefined) slot.allocatedMinutes = dto.allocatedMinutes;

        const saved = await this.slotRepo.save(slot);
        this.logger.log(`Slot ${slotId} updated on programme ${programmeId}`);
        return saved;
    }

    async reorderSlots(programmeId: string, dto: ReorderProgrammeSlotsDto): Promise<ServiceProgrammeSlot[]> {
        const programme = await this.programmeRepo.findOne({
            where: {id: programmeId},
            relations: ['slots'],
        });
        if (!programme) throw new NotFoundException('Programme not found');
        if (programme.status !== ServiceProgrammeStatusEnum.DRAFT) {
            throw new BadRequestException('Slots can only be reordered on DRAFT programmes');
        }

        const slotMap = new Map(programme.slots.map((s) => [s.id, s]));
        const orderedIds = dto.slots.map((s) => s.id);
        if (orderedIds.some((id) => !slotMap.has(id)) || orderedIds.length !== programme.slots.length) {
            throw new BadRequestException('Slot list must contain exactly the existing slot IDs');
        }

        const updated = orderedIds.map((id, index) => {
            const slot = slotMap.get(id);
            slot.position = index;
            return slot;
        });
        return this.slotRepo.save(updated);
    }

    async removeSlot(programmeId: string, slotId: string): Promise<void> {
        const slot = await this.slotRepo.findOne({
            where: {id: slotId, programme: {id: programmeId}},
            relations: ['programme'],
        });
        if (!slot) throw new NotFoundException('Slot not found');
        if (slot.programme.status !== ServiceProgrammeStatusEnum.DRAFT) {
            throw new BadRequestException('Slots can only be removed from DRAFT programmes');
        }
        await this.slotRepo.remove(slot);
        this.logger.log(`Slot ${slotId} removed from programme ${programmeId}`);
    }

    async applyTemplate(programmeId: string, templateId: string): Promise<ServiceProgramme> {
        const programme = await this.programmeRepo.findOne({
            where: {id: programmeId},
            relations: ['slots'],
        });
        if (!programme) throw new NotFoundException('Programme not found');
        if (programme.status !== ServiceProgrammeStatusEnum.DRAFT) {
            throw new BadRequestException('Templates can only be applied to DRAFT programmes');
        }

        const template = await this.templateRepo.findOne({where: {id: templateId}});
        if (!template) throw new NotFoundException('Template not found');

        const result = await this.dataSource.transaction(async (manager) => {
            if (programme.slots.length > 0) {
                await manager.remove(ServiceProgrammeSlot, programme.slots);
            }
            const newSlots = template.slots.map((s) =>
                manager.create(ServiceProgrammeSlot, {
                    programme,
                    position: s.position,
                    type: s.type,
                    topic: s.topic,
                    allocatedMinutes: s.allocatedMinutes,
                }),
            );
            programme.slots = await manager.save(ServiceProgrammeSlot, newSlots);
            return manager.save(ServiceProgramme, programme);
        });
        this.logger.log(`Template ${templateId} applied to programme ${programmeId} (${result.slots.length} slots)`);
        return result;
    }

    async findAllTemplates(): Promise<ServiceProgrammeTemplate[]> {
        return this.templateRepo.find({order: {name: 'ASC'}});
    }

    async removeTemplate(id: string): Promise<void> {
        const template = await this.templateRepo.findOne({where: {id}});
        if (!template) throw new NotFoundException('Template not found');
        await this.templateRepo.remove(template);
        this.logger.log(`Template ${id} deleted`);
    }

    async downloadPdf(id: string): Promise<Buffer> {
        const programme = await this.programmeRepo.findOne({
            where: {id},
            relations: [
                'serviceSlot',
                'serviceSlot.event',
                'slots',
                'slots.member',
                'slots.backupMember',
            ],
            order: {slots: {position: 'ASC'}},
        });
        if (!programme) throw new NotFoundException('Programme not found');
        return this.pdfService.generateProgrammeDraft(programme);
    }

    async downloadEventPdf(eventId: string): Promise<{buffer: Buffer; eventName: string}> {
        const slots = await this.serviceSlotRepo.find({
            where: {event: {id: eventId}},
            relations: ['event'],
            order: {startTime: 'ASC'},
        });
        if (!slots.length) throw new NotFoundException('Event not found or has no service slots');

        const programmes = await this.programmeRepo.find({
            where: slots.map((s) => ({serviceSlot: {id: s.id}})),
            relations: ['serviceSlot', 'slots', 'slots.member', 'slots.backupMember'],
            order: {slots: {position: 'ASC'}},
        });

        const programmeBySlotId = new Map(programmes.map((p) => [p.serviceSlot.id, p]));

        const sections = slots.map((s) => ({
            slot: s,
            programme: programmeBySlotId.get(s.id) ?? null,
        }));

        const event = slots[0].event;
        const buffer = await this.pdfService.generateEventProgramme(event, sections);
        return {buffer, eventName: event.name};
    }

    async upsertTemplateFromProgramme(programme: ServiceProgramme): Promise<void> {
        const slotName = (programme as any).serviceSlot?.name ?? 'Service';
        const slots: TemplateProgrammeSlot[] = [...programme.slots]
            .sort((a, b) => a.position - b.position)
            .map((s) => ({
                position: s.position,
                type: s.type,
                topic: s.topic,
                allocatedMinutes: s.allocatedMinutes,
            }));

        const existing = await this.templateRepo.findOne({where: {serviceSlotName: slotName}});
        if (existing) {
            existing.slots = slots;
            existing.createdFrom = programme;
            await this.templateRepo.save(existing);
            this.logger.log(`Template "${slotName}" updated from programme ${programme.id}`);
        } else {
            const template = this.templateRepo.create({
                name: slotName,
                serviceSlotName: slotName,
                slots,
                createdFrom: programme,
            });
            await this.templateRepo.save(template);
            this.logger.log(`Template "${slotName}" created from programme ${programme.id}`);
        }
    }

    async assertProgrammeIsDraft(id: string): Promise<ServiceProgramme> {
        const programme = await this.programmeRepo.findOne({
            where: {id},
            relations: ['slots', 'slots.member', 'slots.backupMember', 'serviceSlot'],
        });
        if (!programme) throw new NotFoundException('Programme not found');
        if (programme.status !== ServiceProgrammeStatusEnum.DRAFT) {
            throw new ForbiddenException('Programme is not in DRAFT status');
        }
        return programme;
    }

    async setProgrammeStatus(id: string, status: ServiceProgrammeStatusEnum): Promise<void> {
        await this.programmeRepo.update(id, {status});
    }
}
