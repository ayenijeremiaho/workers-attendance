import {Test, TestingModule} from '@nestjs/testing';
import {BadRequestException, ForbiddenException, NotFoundException} from '@nestjs/common';
import {getRepositoryToken} from '@nestjs/typeorm';
import {ConfigService} from '@nestjs/config';
import {DataSource} from 'typeorm';
import {FollowUpService} from './follow-up.service';
import {FirstTimer} from '../entity/first-timer.entity';
import {FollowUpTask} from '../entity/follow-up-task.entity';
import {FollowUpNote} from '../entity/follow-up-note.entity';
import {WorkerProfile} from '../../member/entity/worker-profile.entity';
import {FollowUpOutcomeEnum, FollowUpTaskStatusEnum, FollowUpTaskTypeEnum} from '../enums/follow-up.enum';
import {DepartmentKeyEnum} from '../../department/enums/department-key.enum';
import {WorkerStatusEnum} from '../../member/enums/worker-status.enum';
import {EmailQueueService} from '../../utility/service/email-queue.service';

const mockFirstTimerRepo = {
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    createQueryBuilder: jest.fn(),
};

const mockTaskRepo = {
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    createQueryBuilder: jest.fn(),
};

const mockNoteRepo = {
    save: jest.fn(),
    create: jest.fn(),
};

const mockWorkerProfileRepo = {
    findOne: jest.fn(),
};

const qbMock = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
    getRawOne: jest.fn(),
    getManyAndCount: jest.fn(),
};

const mockDataSource = {
    createQueryBuilder: jest.fn().mockReturnValue(qbMock),
    transaction: jest.fn(),
};

const mockConfigService = {
    get: jest.fn((key: string, def: any) => def),
};

const mockEmailQueueService = {
    queueEmailWithTemplate: jest.fn(),
};

const followUpProfile = {
    id: 'wp-1',
    status: WorkerStatusEnum.ACTIVE,
    member: {id: 'member-1', firstname: 'Ada', email: 'ada@test.com'},
    department: {id: 'dept-1', key: DepartmentKeyEnum.FOLLOW_UP, name: 'Follow-Up'},
    secondaryDepartment: null,
};

const nonFollowUpProfile = {
    id: 'wp-2',
    status: WorkerStatusEnum.ACTIVE,
    member: {id: 'member-2', firstname: 'Bola', email: 'bola@test.com'},
    department: {id: 'dept-2', key: DepartmentKeyEnum.WORSHIP, name: 'Worship'},
    secondaryDepartment: null,
};

describe('FollowUpService', () => {
    let service: FollowUpService;

    beforeEach(async () => {
        jest.clearAllMocks();
        qbMock.getRawMany.mockResolvedValue([]);
        qbMock.getRawOne.mockResolvedValue({total: '0', wantsToJoinChurch: '0', wantsToJoinWorkforce: '0', count: '0'});

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FollowUpService,
                {provide: DataSource, useValue: mockDataSource},
                {provide: ConfigService, useValue: mockConfigService},
                {provide: EmailQueueService, useValue: mockEmailQueueService},
                {provide: getRepositoryToken(FirstTimer), useValue: mockFirstTimerRepo},
                {provide: getRepositoryToken(FollowUpTask), useValue: mockTaskRepo},
                {provide: getRepositoryToken(FollowUpNote), useValue: mockNoteRepo},
                {provide: getRepositoryToken(WorkerProfile), useValue: mockWorkerProfileRepo},
            ],
        }).compile();

        service = module.get<FollowUpService>(FollowUpService);
    });

    // ── assertWorkerInFollowUpDept ────────────────────────────────────────────

    describe('assertWorkerInFollowUpDept', () => {
        it('throws ForbiddenException when worker profile not found', async () => {
            mockWorkerProfileRepo.findOne.mockResolvedValue(null);
            await expect(service.assertWorkerInFollowUpDept('member-1')).rejects.toThrow(ForbiddenException);
        });

        it('throws ForbiddenException when worker is not in FOLLOW_UP dept', async () => {
            mockWorkerProfileRepo.findOne.mockResolvedValue(nonFollowUpProfile);
            await expect(service.assertWorkerInFollowUpDept('member-1')).rejects.toThrow(ForbiddenException);
        });

        it('resolves when worker primary dept is FOLLOW_UP', async () => {
            mockWorkerProfileRepo.findOne.mockResolvedValue(followUpProfile);
            await expect(service.assertWorkerInFollowUpDept('member-1')).resolves.toBeUndefined();
        });

        it('resolves when worker secondary dept is FOLLOW_UP', async () => {
            mockWorkerProfileRepo.findOne.mockResolvedValue({
                ...nonFollowUpProfile,
                secondaryDepartment: {id: 'dept-3', key: DepartmentKeyEnum.FOLLOW_UP},
            });
            await expect(service.assertWorkerInFollowUpDept('member-1')).resolves.toBeUndefined();
        });
    });

    // ── pickRoundRobinAssignee ────────────────────────────────────────────────

    describe('pickRoundRobinAssignee', () => {
        it('returns null when no FOLLOW_UP workers exist', async () => {
            qbMock.getRawMany.mockResolvedValue([]);
            const result = await service.pickRoundRobinAssignee();
            expect(result).toBeNull();
        });

        it('returns the worker with the fewest open tasks (with member relation)', async () => {
            qbMock.getRawMany.mockResolvedValue([{id: 'wp-1', openCount: '0'}]);
            mockWorkerProfileRepo.findOne.mockResolvedValue(followUpProfile);
            const result = await service.pickRoundRobinAssignee();
            expect(result).toEqual(followUpProfile);
            expect(mockWorkerProfileRepo.findOne).toHaveBeenCalledWith({
                where: {id: 'wp-1'},
                relations: ['member'],
            });
        });
    });

    // ── createFirstTimerByWorker ──────────────────────────────────────────────

    describe('createFirstTimerByWorker', () => {
        it('throws ForbiddenException when caller is not in FOLLOW_UP dept', async () => {
            mockWorkerProfileRepo.findOne.mockResolvedValue(nonFollowUpProfile);
            await expect(
                service.createFirstTimerByWorker({firstname: 'A', lastname: 'B', phone: '08011111111'}, 'member-1'),
            ).rejects.toThrow(ForbiddenException);
        });

        it('throws BadRequestException when no FOLLOW_UP assignee is available', async () => {
            mockWorkerProfileRepo.findOne.mockResolvedValue(followUpProfile);
            mockDataSource.transaction.mockImplementation(async (cb: any) => {
                const manager = {
                    query: jest.fn()
                        .mockResolvedValueOnce([])   // advisory lock
                        .mockResolvedValueOnce([]),  // pick → no workers
                    findOne: jest.fn(),
                    create: jest.fn(),
                    save: jest.fn(),
                };
                return cb(manager);
            });

            await expect(
                service.createFirstTimerByWorker({firstname: 'A', lastname: 'B', phone: '08011111111'}, 'member-1'),
            ).rejects.toThrow(BadRequestException);
        });

        it('creates first-timer, assigns task, and sends assignment email', async () => {
            mockWorkerProfileRepo.findOne.mockResolvedValue(followUpProfile);

            const savedFirstTimer = {id: 'ft-1', firstname: 'Ada', lastname: 'Obi', phone: '08011111111'};
            const savedTask = {id: 'task-1', type: FollowUpTaskTypeEnum.FIRST_TIMER};

            mockDataSource.transaction.mockImplementation(async (cb: any) => {
                const manager = {
                    query: jest.fn()
                        .mockResolvedValueOnce([])               // advisory lock
                        .mockResolvedValueOnce([{id: 'wp-1'}]), // pick
                    findOne: jest.fn().mockResolvedValue(followUpProfile),
                    create: jest.fn().mockReturnValue(savedFirstTimer),
                    save: jest.fn()
                        .mockResolvedValueOnce(savedFirstTimer)
                        .mockResolvedValueOnce(savedTask),
                };
                return cb(manager);
            });

            const result = await service.createFirstTimerByWorker(
                {firstname: 'Ada', lastname: 'Obi', phone: '08011111111'},
                'member-1',
            );

            expect(result).toEqual(savedFirstTimer);
            expect(mockEmailQueueService.queueEmailWithTemplate).toHaveBeenCalledWith(
                'ada@test.com',
                expect.stringContaining('New Follow-Up Task Assigned'),
                'follow-up-task-assigned',
                expect.objectContaining({workerName: 'Ada', firstTimerName: 'Ada Obi'}),
            );
        });
    });

    // ── createFirstTimerByAdmin ───────────────────────────────────────────────

    describe('createFirstTimerByAdmin', () => {
        it('creates first-timer linked to admin and sends assignment email', async () => {
            const savedFirstTimer = {id: 'ft-2', firstname: 'Bola'};

            mockDataSource.transaction.mockImplementation(async (cb: any) => {
                const manager = {
                    query: jest.fn()
                        .mockResolvedValueOnce([])               // advisory lock
                        .mockResolvedValueOnce([{id: 'wp-1'}]), // pick
                    findOne: jest.fn().mockResolvedValue(followUpProfile),
                    create: jest.fn().mockReturnValue(savedFirstTimer),
                    save: jest.fn().mockResolvedValue(savedFirstTimer),
                };
                return cb(manager);
            });

            const result = await service.createFirstTimerByAdmin(
                {firstname: 'Bola', lastname: 'Ade', phone: '08022222222'},
                'admin-1',
            );

            expect(result).toEqual(savedFirstTimer);
            expect(mockEmailQueueService.queueEmailWithTemplate).toHaveBeenCalled();
        });
    });

    // ── updateTask ───────────────────────────────────────────────────────────

    describe('updateTask', () => {
        it('throws ForbiddenException when caller is not in FOLLOW_UP dept', async () => {
            mockWorkerProfileRepo.findOne.mockResolvedValue(nonFollowUpProfile);
            await expect(
                service.updateTask('task-1', {status: FollowUpTaskStatusEnum.IN_PROGRESS}, 'member-1'),
            ).rejects.toThrow(ForbiddenException);
        });

        it('throws NotFoundException when task not found or not assigned to caller', async () => {
            mockWorkerProfileRepo.findOne.mockResolvedValue(followUpProfile);
            mockTaskRepo.findOne.mockResolvedValue(null);
            await expect(
                service.updateTask('task-1', {status: FollowUpTaskStatusEnum.IN_PROGRESS}, 'member-1'),
            ).rejects.toThrow(NotFoundException);
        });

        it('updates status, outcome, and adds a note when provided', async () => {
            mockWorkerProfileRepo.findOne.mockResolvedValue(followUpProfile);
            const task = {
                id: 'task-1',
                status: FollowUpTaskStatusEnum.PENDING,
                outcome: null,
                outcomeNotes: null,
            };
            mockTaskRepo.findOne.mockResolvedValue(task);
            mockTaskRepo.save.mockResolvedValue({...task, status: FollowUpTaskStatusEnum.COMPLETED, outcome: FollowUpOutcomeEnum.JOINED});
            mockNoteRepo.create.mockReturnValue({content: 'Spoke with them'});
            mockNoteRepo.save.mockResolvedValue({});

            const result = await service.updateTask(
                'task-1',
                {
                    status: FollowUpTaskStatusEnum.COMPLETED,
                    outcome: FollowUpOutcomeEnum.JOINED,
                    noteContent: 'Spoke with them',
                },
                'member-1',
            );

            expect(result.status).toBe(FollowUpTaskStatusEnum.COMPLETED);
            expect(mockNoteRepo.save).toHaveBeenCalled();
        });
    });

    // ── reassignTask ─────────────────────────────────────────────────────────

    describe('reassignTask', () => {
        it('throws NotFoundException when task not found', async () => {
            mockTaskRepo.findOne.mockResolvedValue(null);
            mockWorkerProfileRepo.findOne.mockResolvedValue(followUpProfile);
            await expect(
                service.reassignTask('task-x', {workerProfileId: 'wp-1'}, 'admin-1'),
            ).rejects.toThrow(NotFoundException);
        });

        it('throws NotFoundException when target worker profile not found', async () => {
            mockTaskRepo.findOne.mockResolvedValue({id: 'task-1'});
            mockWorkerProfileRepo.findOne.mockResolvedValue(null);
            await expect(
                service.reassignTask('task-1', {workerProfileId: 'wp-x'}, 'admin-1'),
            ).rejects.toThrow(NotFoundException);
        });

        it('throws BadRequestException when target worker is not in FOLLOW_UP dept', async () => {
            mockTaskRepo.findOne.mockResolvedValue({id: 'task-1', assignedTo: followUpProfile});
            mockWorkerProfileRepo.findOne
                .mockResolvedValueOnce(nonFollowUpProfile)
                .mockResolvedValueOnce(nonFollowUpProfile);
            await expect(
                service.reassignTask('task-1', {workerProfileId: 'wp-2'}, 'admin-1'),
            ).rejects.toThrow(BadRequestException);
        });

        it('reassigns task and sends email to new assignee', async () => {
            const task = {id: 'task-1', assignedTo: nonFollowUpProfile, dueDate: null};
            mockTaskRepo.findOne.mockResolvedValue(task);
            mockWorkerProfileRepo.findOne
                .mockResolvedValueOnce(followUpProfile)
                .mockResolvedValueOnce(followUpProfile);
            mockTaskRepo.save.mockResolvedValue({...task, assignedTo: followUpProfile});

            const result = await service.reassignTask('task-1', {workerProfileId: 'wp-1'}, 'admin-1');
            expect(result.assignedTo).toEqual(followUpProfile);
            expect(mockEmailQueueService.queueEmailWithTemplate).toHaveBeenCalledWith(
                'ada@test.com',
                expect.stringContaining('Reassigned'),
                'follow-up-task-assigned',
                expect.objectContaining({workerName: 'Ada'}),
            );
        });
    });

    // ── bulkUpdateTasks ──────────────────────────────────────────────────────

    describe('bulkUpdateTasks', () => {
        it('updates all matching tasks and returns count', async () => {
            const tasks = [
                {id: 'task-1', status: FollowUpTaskStatusEnum.PENDING},
                {id: 'task-2', status: FollowUpTaskStatusEnum.PENDING},
            ];
            mockTaskRepo.find.mockResolvedValue(tasks);
            mockTaskRepo.save.mockResolvedValue(tasks);

            const result = await service.bulkUpdateTasks({
                tasks: [
                    {id: 'task-1', status: FollowUpTaskStatusEnum.COMPLETED},
                    {id: 'task-2', status: FollowUpTaskStatusEnum.COMPLETED},
                ],
            });

            expect(result).toEqual({updated: 2});
            expect(tasks[0].status).toBe(FollowUpTaskStatusEnum.COMPLETED);
            expect(tasks[1].status).toBe(FollowUpTaskStatusEnum.COMPLETED);
        });
    });

    // ── createTaskForOnlineNonResponder ──────────────────────────────────────

    describe('createTaskForOnlineNonResponder', () => {
        it('returns null when no FOLLOW_UP assignee is available', async () => {
            qbMock.getRawMany.mockResolvedValue([]);
            const result = await service.createTaskForOnlineNonResponder('member-1', 'event-1');
            expect(result).toBeNull();
        });

        it('creates task, sets dueDate, and sends assignment email', async () => {
            qbMock.getRawMany.mockResolvedValue([{id: 'wp-1', openCount: '1'}]);
            mockWorkerProfileRepo.findOne.mockResolvedValue(followUpProfile);
            const task = {id: 'task-online-1', type: FollowUpTaskTypeEnum.ONLINE_NO_RESPONSE};
            mockTaskRepo.create.mockReturnValue(task);
            mockTaskRepo.save.mockResolvedValue(task);

            const result = await service.createTaskForOnlineNonResponder('member-1', 'event-1');
            expect(result?.type).toBe(FollowUpTaskTypeEnum.ONLINE_NO_RESPONSE);
            expect(mockTaskRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({dueDate: expect.any(Date)}),
            );
            expect(mockEmailQueueService.queueEmailWithTemplate).toHaveBeenCalledWith(
                'ada@test.com',
                expect.any(String),
                'follow-up-task-assigned',
                expect.objectContaining({workerName: 'Ada'}),
            );
        });
    });

    // ── getReport ────────────────────────────────────────────────────────────

    describe('getReport', () => {
        beforeEach(() => {
            qbMock.getRawOne.mockResolvedValue({total: '5', wantsToJoinChurch: '3', wantsToJoinWorkforce: '2', count: '1'});
            qbMock.getRawMany.mockResolvedValue([]);
        });

        it('returns zeroed report when no data exists', async () => {
            qbMock.getRawOne.mockResolvedValue({total: '0', wantsToJoinChurch: '0', wantsToJoinWorkforce: '0', count: '0'});
            const report = await service.getReport();
            expect(report.firstTimers.total).toBe(0);
            expect(report.tasks.total).toBe(0);
            expect(report.tasks.conversionRate).toBe('0%');
        });

        it('returns all-time stats when no date range given', async () => {
            const report = await service.getReport();
            expect(report.period.from).toBeNull();
            expect(report.period.to).toBeNull();
        });

        it('returns period-filtered stats when date range provided', async () => {
            const from = new Date('2026-01-01');
            const to = new Date('2026-06-30');
            const report = await service.getReport(from, to);
            expect(report.period.from).toBe(from.toISOString());
            expect(report.period.to).toBe(to.toISOString());
        });

        it('computes conversionRate correctly', async () => {
            qbMock.getRawOne.mockResolvedValue({total: '0', wantsToJoinChurch: '0', wantsToJoinWorkforce: '0', count: '0'});
            qbMock.getRawMany
                .mockResolvedValueOnce([])  // sourceRows
                .mockResolvedValueOnce([    // taskStatusRows
                    {status: 'COMPLETED', count: '10'},
                    {status: 'PENDING', count: '5'},
                ])
                .mockResolvedValueOnce([    // outcomeRows
                    {outcome: 'JOINED', count: '4'},
                ])
                .mockResolvedValueOnce([])  // workerRows
                .mockResolvedValueOnce([]); // eventRows

            const report = await service.getReport();
            expect(report.tasks.total).toBe(15);
            expect(report.tasks.conversionRate).toBe('26.7%');
        });

        it('maps byWorker and byEvent rows to numbers', async () => {
            qbMock.getRawOne.mockResolvedValue({total: '0', wantsToJoinChurch: '0', wantsToJoinWorkforce: '0', count: '0'});
            qbMock.getRawMany
                .mockResolvedValueOnce([])  // sourceRows
                .mockResolvedValueOnce([])  // taskStatusRows
                .mockResolvedValueOnce([])  // outcomeRows
                .mockResolvedValueOnce([{workerName: 'Ada Obi', assigned: '8', completed: '6', joined: '3'}])
                .mockResolvedValueOnce([{eventName: 'Sunday Service', firstTimers: '12'}]);

            const report = await service.getReport();
            expect(report.byWorker[0]).toEqual({workerName: 'Ada Obi', assigned: 8, completed: 6, joined: 3});
            expect(report.byEvent[0]).toEqual({eventName: 'Sunday Service', firstTimers: 12});
        });
    });
});
