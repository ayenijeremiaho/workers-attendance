import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrayerRosterService } from './prayer-roster.service';
import { PrayerMeeting } from '../entity/prayer-meeting.entity';
import { PrayerRosterEntry } from '../entity/prayer-roster-entry.entity';
import { PrayerScheduleRule } from '../entity/prayer-schedule-rule.entity';
import { WorkerProfile } from '../../member/entity/worker-profile.entity';
import { DepartmentLead } from '../../department/entity/department-lead.entity';
import {
  PrayerAssignmentType,
  PrayerMeetingStatus,
  PrayerRosterStatus,
  PrayerRuleType,
  PrayerWindowStatus,
} from '../enum/prayer.enum';
import { WorkerStatusEnum } from '../../member/enums/worker-status.enum';
import { DepartmentLeadTypeEnum } from '../../department/enums/department-lead-type.enum';

const makeWorker = (id: string): WorkerProfile =>
  ({ id, status: WorkerStatusEnum.ACTIVE }) as WorkerProfile;

const makeMeeting = (
  id: string,
  capacity = 0,
  maxCapacity = 10,
): PrayerMeeting =>
  ({
    id,
    date: '2026-07-01',
    month: 7,
    year: 2026,
    status: PrayerMeetingStatus.SCHEDULED,
    selectionStatus: PrayerWindowStatus.OPEN,
    currentCapacity: capacity,
    dayConfig: { id: 'dc-1', maxCapacity },
    rosterEntries: [],
  }) as any;

const baseRules: PrayerScheduleRule[] = [
  {
    id: 'r1',
    type: PrayerRuleType.ROLE_FREQUENCY,
    targetLeadType: null,
    value: 1,
    description: 'worker default',
    isActive: true,
  } as any,
  {
    id: 'r2',
    type: PrayerRuleType.ROLE_FREQUENCY,
    targetLeadType: DepartmentLeadTypeEnum.HOD,
    value: 2,
    description: 'HOD',
    isActive: true,
  } as any,
  {
    id: 'r3',
    type: PrayerRuleType.ROLE_FREQUENCY,
    targetLeadType: DepartmentLeadTypeEnum.D_HOD,
    value: 2,
    description: 'D.HOD',
    isActive: true,
  } as any,
  {
    id: 'r4',
    type: PrayerRuleType.MIN_LEADERS_PER_MEETING,
    targetLeadType: null,
    value: 1,
    description: 'min leaders',
    isActive: true,
  } as any,
  {
    id: 'r5',
    type: PrayerRuleType.MAX_PER_MEETING,
    targetLeadType: null,
    value: 10,
    description: 'max per meeting',
    isActive: true,
  } as any,
];

const mockMeetingQueryBuilder = {
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  getMany: jest.fn(),
};
const mockMeetingRepo = {
  find: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue(mockMeetingQueryBuilder),
};
const mockRosterRepo = { find: jest.fn(), save: jest.fn() };
const mockRuleRepo = { find: jest.fn() };
const mockWorkerRepo = { find: jest.fn() };
const mockDeptLeadRepo = { find: jest.fn(), findOne: jest.fn() };

describe('PrayerRosterService', () => {
  let service: PrayerRosterService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrayerRosterService,
        {
          provide: getRepositoryToken(PrayerMeeting),
          useValue: mockMeetingRepo,
        },
        {
          provide: getRepositoryToken(PrayerRosterEntry),
          useValue: mockRosterRepo,
        },
        {
          provide: getRepositoryToken(PrayerScheduleRule),
          useValue: mockRuleRepo,
        },
        {
          provide: getRepositoryToken(WorkerProfile),
          useValue: mockWorkerRepo,
        },
        {
          provide: getRepositoryToken(DepartmentLead),
          useValue: mockDeptLeadRepo,
        },
      ],
    }).compile();
    service = module.get<PrayerRosterService>(PrayerRosterService);
  });

  describe('autoAssign', () => {
    it('throws NotFoundException when no meetings exist', async () => {
      mockMeetingRepo.find.mockResolvedValue([]);
      await expect(service.autoAssign(7, 2026)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('assigns regular workers exactly once', async () => {
      const worker = makeWorker('w1');
      const meeting = makeMeeting('m1');

      mockMeetingRepo.find.mockResolvedValue([meeting]);
      mockRuleRepo.find.mockResolvedValue(baseRules);
      mockWorkerRepo.find.mockResolvedValue([worker]);
      mockDeptLeadRepo.find.mockResolvedValue([]);
      mockRosterRepo.find.mockResolvedValue([]);
      mockRosterRepo.save.mockResolvedValue([]);
      mockMeetingRepo.save.mockResolvedValue([]);

      const result = await service.autoAssign(7, 2026);
      expect(result.assigned).toBe(1);
      expect(mockRosterRepo.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            workerProfile: worker,
            meeting,
            assignmentType: PrayerAssignmentType.AUTO_ASSIGNED,
          }),
        ]),
      );
    });

    it('assigns HODs exactly twice across two meetings', async () => {
      const hod = makeWorker('hod1');
      const meetings = [makeMeeting('m1'), makeMeeting('m2')];

      mockMeetingRepo.find.mockResolvedValue(meetings);
      mockRuleRepo.find.mockResolvedValue(baseRules);
      mockWorkerRepo.find.mockResolvedValue([hod]);
      mockDeptLeadRepo.find.mockResolvedValue([
        { workerProfile: hod, leadType: DepartmentLeadTypeEnum.HOD },
      ]);
      mockRosterRepo.find.mockResolvedValue([]);
      mockRosterRepo.save.mockResolvedValue([]);
      mockMeetingRepo.save.mockResolvedValue([]);

      const result = await service.autoAssign(7, 2026);
      expect(result.assigned).toBe(2);
    });

    it('skips workers already at required frequency', async () => {
      const worker = makeWorker('w1');
      const meeting = makeMeeting('m1', 1);

      mockMeetingRepo.find.mockResolvedValue([meeting]);
      mockRuleRepo.find.mockResolvedValue(baseRules);
      mockWorkerRepo.find.mockResolvedValue([worker]);
      mockDeptLeadRepo.find.mockResolvedValue([]);
      mockRosterRepo.find.mockResolvedValue([
        {
          workerProfile: worker,
          meeting,
          assignmentType: PrayerAssignmentType.FIXED,
        },
      ]);
      mockRosterRepo.save.mockResolvedValue([]);
      mockMeetingRepo.save.mockResolvedValue([]);

      const result = await service.autoAssign(7, 2026);
      expect(result.assigned).toBe(0);
    });

    it('does not assign a worker to the same meeting twice', async () => {
      const worker = makeWorker('hod1');
      const meeting = makeMeeting('m1');

      mockMeetingRepo.find.mockResolvedValue([meeting]);
      mockRuleRepo.find.mockResolvedValue(baseRules);
      mockWorkerRepo.find.mockResolvedValue([worker]);
      mockDeptLeadRepo.find.mockResolvedValue([
        { workerProfile: worker, leadType: DepartmentLeadTypeEnum.HOD },
      ]);
      mockRosterRepo.find.mockResolvedValue([]);
      mockRosterRepo.save.mockResolvedValue([]);
      mockMeetingRepo.save.mockResolvedValue([]);

      const result = await service.autoAssign(7, 2026);
      const savedEntries: any[] = mockRosterRepo.save.mock.calls[0]?.[0] ?? [];
      const forMeeting = savedEntries.filter(
        (e: any) => e.meeting?.id === 'm1',
      );
      expect(forMeeting.length).toBe(1);
      expect(result.unassignable).toContain('hod1');
    });

    it('marks worker as unassignable when all meetings are full', async () => {
      const worker = makeWorker('w1');
      const meeting = makeMeeting('m1', 10, 10);

      mockMeetingRepo.find.mockResolvedValue([meeting]);
      mockRuleRepo.find.mockResolvedValue(baseRules);
      mockWorkerRepo.find.mockResolvedValue([worker]);
      mockDeptLeadRepo.find.mockResolvedValue([]);
      mockRosterRepo.find.mockResolvedValue([]);
      mockRosterRepo.save.mockResolvedValue([]);
      mockMeetingRepo.save.mockResolvedValue([]);

      const result = await service.autoAssign(7, 2026);
      expect(result.unassignable).toContain('w1');
    });
  });

  describe('reschedule', () => {
    it('throws NotFoundException when entry does not exist', async () => {
      const rosterRepo = (service as any).rosterRepo;
      rosterRepo.findOne = jest.fn().mockResolvedValue(null);
      await expect(
        service.reschedule('missing', { newMeetingId: 'm2' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when target meeting is full', async () => {
      const entry = {
        id: 'e1',
        workerProfile: makeWorker('w1'),
        meeting: makeMeeting('m1'),
        assignmentType: PrayerAssignmentType.SELF_SELECTED,
        status: PrayerRosterStatus.SCHEDULED,
      };
      const fullMeeting = makeMeeting('m2', 10, 10);

      const rosterRepo = (service as any).rosterRepo;
      const meetingRepo = (service as any).meetingRepo;
      rosterRepo.findOne = jest
        .fn()
        .mockResolvedValueOnce(entry)
        .mockResolvedValueOnce(null);
      meetingRepo.findOne = jest.fn().mockResolvedValue(fullMeeting);

      await expect(
        service.reschedule('e1', { newMeetingId: 'm2' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates a new entry linked to rescheduledFrom and soft-deletes the old one', async () => {
      const worker = makeWorker('w1');
      const oldMeeting = makeMeeting('m1', 1);
      const newMeeting = makeMeeting('m2', 0);
      const entry = {
        id: 'e1',
        workerProfile: worker,
        meeting: oldMeeting,
        assignmentType: PrayerAssignmentType.SELF_SELECTED,
        status: PrayerRosterStatus.SCHEDULED,
      };
      const savedEntry = {
        ...entry,
        id: 'e2',
        meeting: newMeeting,
        rescheduledFrom: entry,
      };

      const rosterRepo = (service as any).rosterRepo;
      const meetingRepo = (service as any).meetingRepo;
      rosterRepo.findOne = jest
        .fn()
        .mockResolvedValueOnce(entry)
        .mockResolvedValueOnce(null);
      meetingRepo.findOne = jest
        .fn()
        .mockResolvedValueOnce(newMeeting)
        .mockResolvedValueOnce(oldMeeting);
      rosterRepo.create = jest.fn().mockReturnValue(savedEntry);
      rosterRepo.save = jest
        .fn()
        .mockResolvedValueOnce(savedEntry)
        .mockResolvedValueOnce({
          ...entry,
          status: PrayerRosterStatus.RESCHEDULED,
        });
      meetingRepo.save = jest.fn().mockResolvedValue(undefined);

      const result = await service.reschedule('e1', { newMeetingId: 'm2' });
      expect(rosterRepo.save).toHaveBeenCalledTimes(2);
      expect(entry.status).toBe(PrayerRosterStatus.RESCHEDULED);
      expect(result.rescheduledFrom).toEqual(entry);
    });
  });

  describe('validateRoster', () => {
    it('returns valid when all workers have exact frequency and all meetings have a leader', async () => {
      const worker = makeWorker('w1');
      const hod = makeWorker('hod1');
      const meeting = {
        ...makeMeeting('m1'),
        rosterEntries: [{ workerProfile: worker }, { workerProfile: hod }],
      };

      mockRuleRepo.find.mockResolvedValue(baseRules);
      mockWorkerRepo.find.mockResolvedValue([worker, hod]);
      mockDeptLeadRepo.find.mockResolvedValue([
        { workerProfile: hod, leadType: DepartmentLeadTypeEnum.HOD },
      ]);
      mockRosterRepo.find.mockResolvedValue([
        { workerProfile: worker, meeting },
        { workerProfile: hod, meeting },
        { workerProfile: hod, meeting: makeMeeting('m2') },
      ]);
      mockMeetingQueryBuilder.getMany.mockResolvedValue([meeting]);

      const result = await service.validateRoster(7, 2026);
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('reports issue when a worker has wrong frequency', async () => {
      const worker = makeWorker('w1');
      const meeting = {
        ...makeMeeting('m1'),
        rosterEntries: [{ workerProfile: worker }],
      };

      mockRuleRepo.find.mockResolvedValue(baseRules);
      mockWorkerRepo.find.mockResolvedValue([worker]);
      mockDeptLeadRepo.find.mockResolvedValue([]);
      mockRosterRepo.find.mockResolvedValue([]);
      mockMeetingQueryBuilder.getMany.mockResolvedValue([meeting]);

      const result = await service.validateRoster(7, 2026);
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.includes('w1'))).toBe(true);
    });
  });
});
