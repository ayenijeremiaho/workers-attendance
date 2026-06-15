import {Test, TestingModule} from '@nestjs/testing';
import {BadRequestException, ForbiddenException, NotFoundException} from '@nestjs/common';
import {getRepositoryToken} from '@nestjs/typeorm';
import {DataSource} from 'typeorm';
import {ServiceSessionService, SessionAnchor} from './service-session.service';
import {ServiceProgrammeService} from './service-programme.service';
import {ServiceSession} from '../entity/service-session.entity';
import {ServiceSessionSlot} from '../entity/service-session-slot.entity';
import {ServicePauseEntry} from '../entity/service-pause-entry.entity';
import {ServiceActionEntry} from '../entity/service-action-entry.entity';
import {WorkerProfile} from '../../member/entity/worker-profile.entity';
import {Member} from '../../member/entity/member.entity';
import {ServiceSessionStatusEnum} from '../enum/service-session-status.enum';
import {ServiceSessionSlotStatusEnum} from '../enum/service-session-slot-status.enum';
import {ServicePauseReasonEnum} from '../enum/service-pause-reason.enum';
import {ServiceProgrammeStatusEnum} from '../enum/service-programme-status.enum';
import {ServiceSlotTypeEnum} from '../enum/service-slot-type.enum';
import {DepartmentKeyEnum} from '../../department/enums/department-key.enum';
import {CacheService} from '../../utility/service/cache.service';
import {EmailQueueService} from '../../utility/service/email-queue.service';
import {PdfService} from '../../utility/service/pdf.service';

const mockCacheService = {
    get: jest.fn().mockResolvedValue(undefined),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(1),
    key: jest.fn().mockReturnValue('cache-key'),
    getOrSet: jest.fn().mockImplementation((_key: string, fn: () => Promise<unknown>) => fn()),
    flushNamespace: jest.fn().mockResolvedValue(undefined),
};

const mockProgrammeSvc = {
    assertProgrammeIsDraft: jest.fn(),
    setProgrammeStatus: jest.fn(),
    upsertTemplateFromProgramme: jest.fn(),
};

const mockSessionRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
};

const mockSessionSlotRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
};

const mockPauseEntryRepo = {
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
};

const mockActionEntryRepo = {
    create: jest.fn(),
    save: jest.fn(),
};

const mockWorkerProfileRepo = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
};

const mockEmailQueueService = {
    queueEmailWithTemplate: jest.fn().mockResolvedValue('job-1'),
    queueEmailWithTemplateAndAttachments: jest.fn().mockResolvedValue('job-2'),
};

const mockPdfService = {
    generateSessionReport: jest.fn().mockResolvedValue(Buffer.from('pdf')),
    generateFullEventReport: jest.fn().mockResolvedValue(Buffer.from('pdf')),
};

const mockMemberRepo = {
    findOne: jest.fn(),
};

const qbMock = {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue(undefined),
};

const mockDataSource = {
    transaction: jest.fn(),
};

const adminDeptProfile = {
    id: 'wp-1',
    department: {id: 'dept-1', key: DepartmentKeyEnum.ADMIN},
    secondaryDepartment: null,
};

const nonAdminProfile = {
    id: 'wp-2',
    department: {id: 'dept-2', key: DepartmentKeyEnum.WORSHIP},
    secondaryDepartment: null,
};

const mockMember = {id: 'member-1', firstname: 'Ada'};

const draftProgramme = {
    id: 'prog-1',
    status: ServiceProgrammeStatusEnum.DRAFT,
    saveAsTemplate: false,
    serviceSlot: {name: 'First Service'},
    slots: [
        {id: 'ps-0', position: 0, type: ServiceSlotTypeEnum.SPEAKER, allocatedMinutes: 30},
        {id: 'ps-1', position: 1, type: ServiceSlotTypeEnum.BREAK, allocatedMinutes: 10},
    ],
};

const liveAnchor: SessionAnchor = {
    currentSlotPosition: 0,
    slotStartedAt: Date.now() - 60_000,
    slotBaseSeconds: 0,
    status: ServiceSessionStatusEnum.LIVE,
    isPaused: false,
    pausedAt: null,
};

const pausedAnchor: SessionAnchor = {
    ...liveAnchor,
    isPaused: true,
    pausedAt: Date.now() - 30_000,
};

const mockSession = {
    id: 'sess-1',
    sessionCode: 'SVC-ABC123',
    status: ServiceSessionStatusEnum.LIVE,
    programme: draftProgramme,
};

describe('ServiceSessionService', () => {
    let service: ServiceSessionService;

    beforeEach(async () => {
        jest.clearAllMocks();
        mockPauseEntryRepo.createQueryBuilder.mockReturnValue(qbMock);
        mockSessionSlotRepo.createQueryBuilder.mockReturnValue(qbMock);
        mockWorkerProfileRepo.createQueryBuilder.mockReturnValue({
            innerJoinAndSelect: jest.fn().mockReturnThis(),
            leftJoin: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([]),
        });
        mockActionEntryRepo.create.mockReturnValue({});
        mockActionEntryRepo.save.mockResolvedValue({});
        mockMemberRepo.findOne.mockResolvedValue(mockMember);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ServiceSessionService,
                {provide: DataSource, useValue: mockDataSource},
                {provide: CacheService, useValue: mockCacheService},
                {provide: ServiceProgrammeService, useValue: mockProgrammeSvc},
                {provide: EmailQueueService, useValue: mockEmailQueueService},
                {provide: PdfService, useValue: mockPdfService},
                {provide: getRepositoryToken(ServiceSession), useValue: mockSessionRepo},
                {provide: getRepositoryToken(ServiceSessionSlot), useValue: mockSessionSlotRepo},
                {provide: getRepositoryToken(ServicePauseEntry), useValue: mockPauseEntryRepo},
                {provide: getRepositoryToken(ServiceActionEntry), useValue: mockActionEntryRepo},
                {provide: getRepositoryToken(WorkerProfile), useValue: mockWorkerProfileRepo},
                {provide: getRepositoryToken(Member), useValue: mockMemberRepo},
            ],
        }).compile();

        service = module.get<ServiceSessionService>(ServiceSessionService);
    });

    // ── assertAdminDeptWorker ─────────────────────────────────────────────────

    describe('access control', () => {
        it('throws ForbiddenException when worker is not in Admin department', async () => {
            mockWorkerProfileRepo.findOne.mockResolvedValue(nonAdminProfile);
            mockCacheService.get.mockResolvedValue(liveAnchor);
            mockSessionRepo.findOne.mockResolvedValue(mockSession);
            await expect(service.advance('SVC-ABC123', 'member-2')).rejects.toThrow(ForbiddenException);
        });

        it('throws ForbiddenException when worker profile not found', async () => {
            mockWorkerProfileRepo.findOne.mockResolvedValue(null);
            await expect(service.advance('SVC-ABC123', 'member-x')).rejects.toThrow(ForbiddenException);
        });

        it('allows access when secondary department key is ADMIN', async () => {
            mockWorkerProfileRepo.findOne.mockResolvedValue({
                ...nonAdminProfile,
                secondaryDepartment: {key: DepartmentKeyEnum.ADMIN},
            });
            mockCacheService.get.mockResolvedValue(liveAnchor);
            mockSessionRepo.findOne.mockResolvedValue(mockSession);
            mockSessionSlotRepo.count.mockResolvedValue(2);
            mockSessionSlotRepo.update.mockResolvedValue(undefined);

            await expect(service.advance('SVC-ABC123', 'member-1')).resolves.not.toThrow();
        });
    });

    // ── start ─────────────────────────────────────────────────────────────────

    describe('start', () => {
        beforeEach(() => {
            mockWorkerProfileRepo.findOne.mockResolvedValue(adminDeptProfile);
            mockProgrammeSvc.assertProgrammeIsDraft.mockResolvedValue(draftProgramme);
            mockProgrammeSvc.setProgrammeStatus.mockResolvedValue(undefined);
        });

        it('creates session and writes Redis anchor', async () => {
            const savedSession = {...mockSession};
            mockDataSource.transaction.mockImplementation(async (cb) => {
                mockSessionRepo.create.mockReturnValue(savedSession);
                mockSessionRepo.save.mockResolvedValue(savedSession);
                mockSessionSlotRepo.create.mockReturnValue({});
                mockSessionSlotRepo.save.mockResolvedValue([]);
                return cb({
                    create: (Entity, data) => mockSessionRepo.create(data),
                    save: (Entity, data) => mockSessionRepo.save(data),
                });
            });

            await service.start('prog-1', 'member-1');
            expect(mockCacheService.set).toHaveBeenCalledWith(
                'cache-key',
                expect.objectContaining({
                    currentSlotPosition: 0,
                    slotBaseSeconds: 0,
                    isPaused: false,
                    status: ServiceSessionStatusEnum.LIVE,
                }),
                expect.any(Number),
            );
            expect(mockProgrammeSvc.setProgrammeStatus).toHaveBeenCalledWith('prog-1', ServiceProgrammeStatusEnum.LIVE);
        });

        it('throws BadRequestException when programme has no slots', async () => {
            mockProgrammeSvc.assertProgrammeIsDraft.mockResolvedValue({...draftProgramme, slots: []});
            await expect(service.start('prog-1', 'member-1')).rejects.toThrow(BadRequestException);
        });
    });

    // ── advance ───────────────────────────────────────────────────────────────

    describe('advance', () => {
        beforeEach(() => {
            mockWorkerProfileRepo.findOne.mockResolvedValue(adminDeptProfile);
            mockCacheService.get.mockResolvedValue(liveAnchor);
            mockSessionRepo.findOne.mockResolvedValue(mockSession);
            mockSessionSlotRepo.count.mockResolvedValue(2);
            mockSessionSlotRepo.update.mockResolvedValue(undefined);
        });

        it('closes current slot and opens next slot', async () => {
            const newAnchor = await service.advance('SVC-ABC123', 'member-1');

            expect(mockSessionSlotRepo.update).toHaveBeenCalledWith(
                expect.objectContaining({position: 0}),
                expect.objectContaining({status: ServiceSessionSlotStatusEnum.COMPLETED}),
            );
            expect(mockSessionSlotRepo.update).toHaveBeenCalledWith(
                expect.objectContaining({position: 1}),
                expect.objectContaining({status: ServiceSessionSlotStatusEnum.IN_PROGRESS}),
            );
            expect(newAnchor.currentSlotPosition).toBe(1);
        });

        it('throws BadRequestException when already on last slot', async () => {
            mockSessionSlotRepo.count.mockResolvedValue(1);
            await expect(service.advance('SVC-ABC123', 'member-1')).rejects.toThrow(BadRequestException);
        });

        it('throws NotFoundException when session anchor not in Redis', async () => {
            mockCacheService.get.mockResolvedValue(undefined);
            await expect(service.advance('SVC-ABC123', 'member-1')).rejects.toThrow(NotFoundException);
        });

        it('throws BadRequestException when session is already completed', async () => {
            mockCacheService.get.mockResolvedValue({...liveAnchor, status: ServiceSessionStatusEnum.COMPLETED});
            await expect(service.advance('SVC-ABC123', 'member-1')).rejects.toThrow(BadRequestException);
        });
    });

    // ── rewind ────────────────────────────────────────────────────────────────

    describe('rewind', () => {
        const anchorAtSlot1: SessionAnchor = {...liveAnchor, currentSlotPosition: 1};

        beforeEach(() => {
            mockWorkerProfileRepo.findOne.mockResolvedValue(adminDeptProfile);
            mockCacheService.get.mockResolvedValue(anchorAtSlot1);
            mockSessionRepo.findOne.mockResolvedValue(mockSession);
            mockSessionSlotRepo.update.mockResolvedValue(undefined);
        });

        it('resets current slot and reopens previous slot', async () => {
            const newAnchor = await service.rewind('SVC-ABC123', 'member-1');

            expect(mockSessionSlotRepo.update).toHaveBeenCalledWith(
                expect.objectContaining({position: 1}),
                expect.objectContaining({status: ServiceSessionSlotStatusEnum.PENDING, actualSeconds: null}),
            );
            expect(mockSessionSlotRepo.update).toHaveBeenCalledWith(
                expect.objectContaining({position: 0}),
                expect.objectContaining({status: ServiceSessionSlotStatusEnum.IN_PROGRESS}),
            );
            expect(newAnchor.currentSlotPosition).toBe(0);
        });

        it('throws BadRequestException when already at first slot', async () => {
            mockCacheService.get.mockResolvedValue(liveAnchor);
            await expect(service.rewind('SVC-ABC123', 'member-1')).rejects.toThrow(BadRequestException);
        });
    });

    // ── pause ─────────────────────────────────────────────────────────────────

    describe('pause', () => {
        beforeEach(() => {
            mockWorkerProfileRepo.findOne.mockResolvedValue(adminDeptProfile);
            mockCacheService.get.mockResolvedValue(liveAnchor);
            mockSessionRepo.findOne.mockResolvedValue(mockSession);
            mockPauseEntryRepo.create.mockReturnValue({});
            mockPauseEntryRepo.save.mockResolvedValue({});
        });

        it('creates pause entry and sets isPaused in Redis', async () => {
            const dto = {reason: ServicePauseReasonEnum.TECHNICAL_ISSUE};
            const newAnchor = await service.pause('SVC-ABC123', dto, 'member-1');

            expect(mockPauseEntryRepo.save).toHaveBeenCalled();
            expect(newAnchor.isPaused).toBe(true);
            expect(newAnchor.pausedAt).not.toBeNull();
            expect(mockCacheService.set).toHaveBeenCalledWith(
                'cache-key',
                expect.objectContaining({isPaused: true}),
                expect.any(Number),
            );
        });

        it('throws BadRequestException when session is already paused', async () => {
            mockCacheService.get.mockResolvedValue(pausedAnchor);
            await expect(service.pause('SVC-ABC123', {reason: ServicePauseReasonEnum.OTHER}, 'member-1'))
                .rejects.toThrow(BadRequestException);
        });
    });

    // ── resume ────────────────────────────────────────────────────────────────

    describe('resume', () => {
        beforeEach(() => {
            mockWorkerProfileRepo.findOne.mockResolvedValue(adminDeptProfile);
            mockCacheService.get.mockResolvedValue(pausedAnchor);
            mockSessionRepo.findOne.mockResolvedValue(mockSession);
        });

        it('closes pause entry and adjusts slotBaseSeconds', async () => {
            const newAnchor = await service.resume('SVC-ABC123', 'member-1');

            expect(qbMock.execute).toHaveBeenCalled();
            expect(newAnchor.isPaused).toBe(false);
            expect(newAnchor.pausedAt).toBeNull();
            expect(newAnchor.slotBaseSeconds).toBeGreaterThanOrEqual(0);
        });

        it('throws BadRequestException when session is not paused', async () => {
            mockCacheService.get.mockResolvedValue(liveAnchor);
            await expect(service.resume('SVC-ABC123', 'member-1')).rejects.toThrow(BadRequestException);
        });
    });

    // ── overrideSlot ─────────────────────────────────────────────────────────

    describe('overrideSlot', () => {
        const mockSessionSlot = {
            id: 'sss-0',
            position: 0,
            overriddenSpeakerName: null,
            overriddenTopic: null,
            adjustedAllocatedMinutes: null,
            overriddenMember: null,
        };

        beforeEach(() => {
            mockWorkerProfileRepo.findOne.mockResolvedValue(adminDeptProfile);
            mockSessionRepo.findOne.mockResolvedValue(mockSession);
            mockSessionSlotRepo.findOne.mockResolvedValue(mockSessionSlot);
            mockSessionSlotRepo.save.mockResolvedValue({...mockSessionSlot, overriddenSpeakerName: 'Pst John'});
        });

        it('updates overridden speaker name', async () => {
            const dto = {overriddenSpeakerName: 'Pst John'};
            const result = await service.overrideSlot('SVC-ABC123', 0, dto, 'member-1');
            expect(result.overriddenSpeakerName).toBe('Pst John');
        });

        it('throws NotFoundException when slot position does not exist', async () => {
            mockSessionSlotRepo.findOne.mockResolvedValue(null);
            await expect(service.overrideSlot('SVC-ABC123', 99, {}, 'member-1')).rejects.toThrow(NotFoundException);
        });
    });

    // ── getFullEventReportPdf ─────────────────────────────────────────────────

    describe('getFullEventReportPdf', () => {
        const buildQb = (sessions: object[]) => ({
            innerJoinAndSelect: jest.fn().mockReturnThis(),
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            addOrderBy: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue(sessions),
        });

        const completedSession = {
            id: 'sess-2',
            sessionCode: 'SVC-EVT001',
            status: ServiceSessionStatusEnum.COMPLETED,
            startedAt: new Date('2026-06-15T09:00:00Z'),
            endedAt: new Date('2026-06-15T11:00:00Z'),
            sessionSlots: [],
            pauseEntries: [],
            programme: {
                id: 'prog-2',
                serviceSlot: {
                    name: 'First Service',
                    startTime: new Date('2026-06-15T09:00:00Z'),
                    endTime: new Date('2026-06-15T11:00:00Z'),
                    event: {name: 'Sunday Service', eventDate: '2026-06-15'},
                },
            },
        };

        it('throws NotFoundException when no sessions found for event', async () => {
            mockSessionRepo.createQueryBuilder.mockReturnValue(buildQb([]));
            await expect(service.getFullEventReportPdf('event-1')).rejects.toThrow(NotFoundException);
        });

        it('throws BadRequestException when a session is not yet completed', async () => {
            const liveSession = {...completedSession, status: ServiceSessionStatusEnum.LIVE};
            mockSessionRepo.createQueryBuilder.mockReturnValue(buildQb([liveSession]));
            await expect(service.getFullEventReportPdf('event-1')).rejects.toThrow(BadRequestException);
        });

        it('generates full event report PDF when all sessions are completed', async () => {
            mockSessionRepo.createQueryBuilder.mockReturnValue(buildQb([completedSession]));
            const buf = await service.getFullEventReportPdf('event-1');
            expect(mockPdfService.generateFullEventReport).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventName: 'Sunday Service',
                    eventDate: '2026-06-15',
                    sessions: expect.arrayContaining([
                        expect.objectContaining({serviceSlotName: 'First Service'}),
                    ]),
                    summary: expect.objectContaining({
                        sessionCount: 1,
                        totalAllocatedMinutes: expect.any(Number),
                        totalSlotVarianceMinutes: expect.any(Number),
                        avgCompletionRate: expect.any(Number),
                    }),
                }),
            );
            expect(buf).toEqual(Buffer.from('pdf'));
        });
    });

    // ── end ───────────────────────────────────────────────────────────────────

    describe('end', () => {
        beforeEach(() => {
            mockWorkerProfileRepo.findOne.mockResolvedValue(adminDeptProfile);
            mockCacheService.get.mockResolvedValue(liveAnchor);
            mockSessionRepo.findOne.mockResolvedValue({...mockSession, programme: draftProgramme});
            mockDataSource.transaction.mockImplementation(async (cb) => cb({
                update: jest.fn().mockResolvedValue(undefined),
            }));
            mockProgrammeSvc.setProgrammeStatus.mockResolvedValue(undefined);
            mockProgrammeSvc.upsertTemplateFromProgramme.mockResolvedValue(undefined);
        });

        it('marks session as COMPLETED and transitions programme status', async () => {
            await service.end('SVC-ABC123', 'member-1');

            expect(mockProgrammeSvc.setProgrammeStatus).toHaveBeenCalledWith(
                draftProgramme.id,
                ServiceProgrammeStatusEnum.COMPLETED,
            );
            expect(mockCacheService.set).toHaveBeenCalledWith(
                'cache-key',
                expect.objectContaining({status: ServiceSessionStatusEnum.COMPLETED}),
                expect.any(Number),
            );
        });

        it('does not upsert template when saveAsTemplate is false', async () => {
            await service.end('SVC-ABC123', 'member-1');
            expect(mockProgrammeSvc.upsertTemplateFromProgramme).not.toHaveBeenCalled();
        });

        it('upserts template when saveAsTemplate is true', async () => {
            const progWithTemplate = {...draftProgramme, saveAsTemplate: true};
            mockSessionRepo.findOne.mockResolvedValue({...mockSession, programme: progWithTemplate});

            await service.end('SVC-ABC123', 'member-1');
            expect(mockProgrammeSvc.upsertTemplateFromProgramme).toHaveBeenCalledWith(progWithTemplate);
        });
    });
});
