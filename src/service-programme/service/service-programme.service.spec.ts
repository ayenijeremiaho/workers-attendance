import {Test, TestingModule} from '@nestjs/testing';
import {BadRequestException, ConflictException, NotFoundException} from '@nestjs/common';
import {getRepositoryToken} from '@nestjs/typeorm';
import {DataSource} from 'typeorm';
import {ServiceProgrammeService} from './service-programme.service';
import {ServiceProgramme} from '../entity/service-programme.entity';
import {ServiceProgrammeSlot} from '../entity/service-programme-slot.entity';
import {ServiceProgrammeTemplate} from '../entity/service-programme-template.entity';
import {ServiceSlot} from '../../event/entity/service-slot.entity';
import {Member} from '../../member/entity/member.entity';
import {Admin} from '../../admin/entity/admin.entity';
import {ServiceProgrammeStatusEnum} from '../enum/service-programme-status.enum';
import {ServiceSlotTypeEnum} from '../enum/service-slot-type.enum';
import {UtilityService} from '../../utility/service/utility.service';

const mockProgrammeRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    remove: jest.fn(),
    update: jest.fn(),
};

const mockSlotRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
};

const mockTemplateRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
};

const mockServiceSlotRepo = {
    findOne: jest.fn(),
};

const mockMemberRepo = {
    findOne: jest.fn(),
};

const mockDataSource = {
    transaction: jest.fn(),
};

const mockAdmin = {id: 'admin-1', member: {firstname: 'Ada'}} as unknown as Admin;

const mockServiceSlot = {id: 'slot-1', name: 'First Service'};

const draftProgramme = {
    id: 'prog-1',
    status: ServiceProgrammeStatusEnum.DRAFT,
    saveAsTemplate: false,
    serviceSlot: mockServiceSlot,
    slots: [],
    createdByAdmin: mockAdmin,
};

const liveProgramme = {...draftProgramme, id: 'prog-2', status: ServiceProgrammeStatusEnum.LIVE};

describe('ServiceProgrammeService', () => {
    let service: ServiceProgrammeService;

    beforeEach(async () => {
        jest.clearAllMocks();
        jest.spyOn(UtilityService, 'createPaginationResponse').mockReturnValue({
            data: [],
            page: 1,
            limit: 20,
            totalCount: 0,
            totalPages: 0,
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ServiceProgrammeService,
                {provide: DataSource, useValue: mockDataSource},
                {provide: getRepositoryToken(ServiceProgramme), useValue: mockProgrammeRepo},
                {provide: getRepositoryToken(ServiceProgrammeSlot), useValue: mockSlotRepo},
                {provide: getRepositoryToken(ServiceProgrammeTemplate), useValue: mockTemplateRepo},
                {provide: getRepositoryToken(ServiceSlot), useValue: mockServiceSlotRepo},
                {provide: getRepositoryToken(Member), useValue: mockMemberRepo},
            ],
        }).compile();

        service = module.get<ServiceProgrammeService>(ServiceProgrammeService);
    });

    // ── create ───────────────────────────────────────────────────────────────

    describe('create', () => {
        it('creates a programme for a valid service slot', async () => {
            mockServiceSlotRepo.findOne.mockResolvedValue(mockServiceSlot);
            mockProgrammeRepo.findOne.mockResolvedValue(null);
            mockProgrammeRepo.create.mockReturnValue(draftProgramme);
            mockProgrammeRepo.save.mockResolvedValue(draftProgramme);

            const result = await service.create({serviceSlotId: 'slot-1', saveAsTemplate: false}, mockAdmin);

            expect(result).toEqual(draftProgramme);
            expect(mockProgrammeRepo.save).toHaveBeenCalledWith(draftProgramme);
        });

        it('throws NotFoundException when service slot does not exist', async () => {
            mockServiceSlotRepo.findOne.mockResolvedValue(null);
            await expect(service.create({serviceSlotId: 'slot-x'}, mockAdmin)).rejects.toThrow(NotFoundException);
        });

        it('throws ConflictException when programme already exists for the slot', async () => {
            mockServiceSlotRepo.findOne.mockResolvedValue(mockServiceSlot);
            mockProgrammeRepo.findOne.mockResolvedValue(draftProgramme);
            await expect(service.create({serviceSlotId: 'slot-1'}, mockAdmin)).rejects.toThrow(ConflictException);
        });
    });

    // ── findAll ──────────────────────────────────────────────────────────────

    describe('findAll', () => {
        it('returns paginated list', async () => {
            mockProgrammeRepo.findAndCount.mockResolvedValue([[draftProgramme], 1]);
            const result = await service.findAll(1, 20);
            expect(UtilityService.createPaginationResponse).toHaveBeenCalledWith([draftProgramme], 1, 20, 1);
            expect(result.totalCount).toBe(0);
        });

        it('throws BadRequestException for page < 1', async () => {
            await expect(service.findAll(0)).rejects.toThrow(BadRequestException);
        });
    });

    // ── findOne ──────────────────────────────────────────────────────────────

    describe('findOne', () => {
        it('returns programme when found', async () => {
            mockProgrammeRepo.findOne.mockResolvedValue(draftProgramme);
            const result = await service.findOne('prog-1');
            expect(result).toEqual(draftProgramme);
        });

        it('throws NotFoundException when programme not found', async () => {
            mockProgrammeRepo.findOne.mockResolvedValue(null);
            await expect(service.findOne('prog-x')).rejects.toThrow(NotFoundException);
        });
    });

    // ── update ───────────────────────────────────────────────────────────────

    describe('update', () => {
        it('updates saveAsTemplate flag', async () => {
            const updated = {...draftProgramme, saveAsTemplate: true};
            mockProgrammeRepo.findOne.mockResolvedValue({...draftProgramme});
            mockProgrammeRepo.save.mockResolvedValue(updated);

            const result = await service.update('prog-1', {saveAsTemplate: true});
            expect(result.saveAsTemplate).toBe(true);
        });

        it('throws NotFoundException when programme not found', async () => {
            mockProgrammeRepo.findOne.mockResolvedValue(null);
            await expect(service.update('prog-x', {saveAsTemplate: true})).rejects.toThrow(NotFoundException);
        });
    });

    // ── remove ───────────────────────────────────────────────────────────────

    describe('remove', () => {
        it('removes a DRAFT programme', async () => {
            mockProgrammeRepo.findOne.mockResolvedValue(draftProgramme);
            await service.remove('prog-1');
            expect(mockProgrammeRepo.remove).toHaveBeenCalledWith(draftProgramme);
        });

        it('throws BadRequestException when programme is not DRAFT', async () => {
            mockProgrammeRepo.findOne.mockResolvedValue(liveProgramme);
            await expect(service.remove('prog-2')).rejects.toThrow(BadRequestException);
        });

        it('throws NotFoundException when programme not found', async () => {
            mockProgrammeRepo.findOne.mockResolvedValue(null);
            await expect(service.remove('prog-x')).rejects.toThrow(NotFoundException);
        });
    });

    // ── addSlot ──────────────────────────────────────────────────────────────

    describe('addSlot', () => {
        const dto = {type: ServiceSlotTypeEnum.SPEAKER, allocatedMinutes: 30};

        it('appends slot at next position', async () => {
            const progWithSlots = {
                ...draftProgramme,
                slots: [{position: 0}, {position: 1}],
            };
            mockProgrammeRepo.findOne.mockResolvedValue(progWithSlots);
            mockMemberRepo.findOne.mockResolvedValue(null);
            const created = {id: 'new-slot', position: 2, ...dto};
            mockSlotRepo.create.mockReturnValue(created);
            mockSlotRepo.save.mockResolvedValue(created);

            const result = await service.addSlot('prog-1', dto);
            expect(mockSlotRepo.create).toHaveBeenCalledWith(expect.objectContaining({position: 2}));
            expect(result.position).toBe(2);
        });

        it('sets position to 0 when programme has no slots', async () => {
            mockProgrammeRepo.findOne.mockResolvedValue(draftProgramme);
            const created = {id: 'new-slot', position: 0, ...dto};
            mockSlotRepo.create.mockReturnValue(created);
            mockSlotRepo.save.mockResolvedValue(created);

            await service.addSlot('prog-1', dto);
            expect(mockSlotRepo.create).toHaveBeenCalledWith(expect.objectContaining({position: 0}));
        });

        it('throws BadRequestException when programme is not DRAFT', async () => {
            mockProgrammeRepo.findOne.mockResolvedValue(liveProgramme);
            await expect(service.addSlot('prog-2', dto)).rejects.toThrow(BadRequestException);
        });

        it('throws NotFoundException when programme not found', async () => {
            mockProgrammeRepo.findOne.mockResolvedValue(null);
            await expect(service.addSlot('prog-x', dto)).rejects.toThrow(NotFoundException);
        });

        it('throws NotFoundException when memberId is provided but member not found', async () => {
            mockProgrammeRepo.findOne.mockResolvedValue(draftProgramme);
            mockMemberRepo.findOne.mockResolvedValue(null);
            await expect(service.addSlot('prog-1', {...dto, memberId: 'member-x'})).rejects.toThrow(NotFoundException);
        });
    });

    // ── reorderSlots ─────────────────────────────────────────────────────────

    describe('reorderSlots', () => {
        const slotA = {id: 'sa', position: 0};
        const slotB = {id: 'sb', position: 1};

        it('reorders slots and saves updated positions', async () => {
            mockProgrammeRepo.findOne.mockResolvedValue({...draftProgramme, slots: [slotA, slotB]});
            mockSlotRepo.save.mockResolvedValue([{...slotB, position: 0}, {...slotA, position: 1}]);

            await service.reorderSlots('prog-1', {slots: [{id: 'sb'}, {id: 'sa'}]});
            expect(mockSlotRepo.save).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({id: 'sb', position: 0}),
                    expect.objectContaining({id: 'sa', position: 1}),
                ]),
            );
        });

        it('throws BadRequestException when slot IDs do not match programme slots', async () => {
            mockProgrammeRepo.findOne.mockResolvedValue({...draftProgramme, slots: [slotA, slotB]});
            await expect(service.reorderSlots('prog-1', {slots: [{id: 'sa'}, {id: 'unknown'}]})).rejects.toThrow(BadRequestException);
        });
    });

    // ── removeSlot ───────────────────────────────────────────────────────────

    describe('removeSlot', () => {
        it('removes a slot from a DRAFT programme', async () => {
            const slot = {id: 'slot-a', programme: draftProgramme};
            mockSlotRepo.findOne.mockResolvedValue(slot);
            await service.removeSlot('prog-1', 'slot-a');
            expect(mockSlotRepo.remove).toHaveBeenCalledWith(slot);
        });

        it('throws BadRequestException when programme is LIVE', async () => {
            mockSlotRepo.findOne.mockResolvedValue({id: 'slot-a', programme: liveProgramme});
            await expect(service.removeSlot('prog-2', 'slot-a')).rejects.toThrow(BadRequestException);
        });

        it('throws NotFoundException when slot not found', async () => {
            mockSlotRepo.findOne.mockResolvedValue(null);
            await expect(service.removeSlot('prog-1', 'slot-x')).rejects.toThrow(NotFoundException);
        });
    });

    // ── upsertTemplateFromProgramme ───────────────────────────────────────────

    describe('upsertTemplateFromProgramme', () => {
        const progWithSlots = {
            ...draftProgramme,
            serviceSlot: {name: 'First Service'},
            slots: [
                {position: 0, type: ServiceSlotTypeEnum.SPEAKER, topic: 'Opening', allocatedMinutes: 10},
                {position: 1, type: ServiceSlotTypeEnum.BREAK, topic: null, allocatedMinutes: 5},
            ],
        } as any;

        it('creates a new template when none exists for the slot name', async () => {
            mockTemplateRepo.findOne.mockResolvedValue(null);
            const created = {id: 'tpl-1'};
            mockTemplateRepo.create.mockReturnValue(created);
            mockTemplateRepo.save.mockResolvedValue(created);

            await service.upsertTemplateFromProgramme(progWithSlots);
            expect(mockTemplateRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({name: 'First Service', serviceSlotName: 'First Service'}),
            );
            expect(mockTemplateRepo.save).toHaveBeenCalledWith(created);
        });

        it('updates existing template when one exists for the slot name', async () => {
            const existingTemplate = {id: 'tpl-1', slots: [], createdFrom: null};
            mockTemplateRepo.findOne.mockResolvedValue(existingTemplate);
            mockTemplateRepo.save.mockResolvedValue({...existingTemplate, slots: progWithSlots.slots});

            await service.upsertTemplateFromProgramme(progWithSlots);
            expect(mockTemplateRepo.create).not.toHaveBeenCalled();
            expect(mockTemplateRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({id: 'tpl-1', createdFrom: progWithSlots}),
            );
        });
    });

    // ── findAllTemplates / removeTemplate ─────────────────────────────────────

    describe('findAllTemplates', () => {
        it('returns all templates ordered by name', async () => {
            const templates = [{id: 'tpl-1', name: 'First Service'}];
            mockTemplateRepo.find.mockResolvedValue(templates);
            const result = await service.findAllTemplates();
            expect(result).toEqual(templates);
        });
    });

    describe('removeTemplate', () => {
        it('removes template when found', async () => {
            const template = {id: 'tpl-1', name: 'First Service'};
            mockTemplateRepo.findOne.mockResolvedValue(template);
            await service.removeTemplate('tpl-1');
            expect(mockTemplateRepo.remove).toHaveBeenCalledWith(template);
        });

        it('throws NotFoundException when template not found', async () => {
            mockTemplateRepo.findOne.mockResolvedValue(null);
            await expect(service.removeTemplate('tpl-x')).rejects.toThrow(NotFoundException);
        });
    });
});
