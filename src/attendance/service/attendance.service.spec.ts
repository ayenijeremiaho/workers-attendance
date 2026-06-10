import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import moment from 'moment';
import { AttendanceService } from './attendance.service';
import { Attendance } from '../entity/attendance.entity';
import { AttendanceStatusEnum } from '../enums/check-in.enum';
import { ServiceSlot } from '../../event/entity/service-slot.entity';
import { MemberService } from '../../member/service/member.service';
import { EventService } from '../../event/service/event.service';
import { UtilityService } from '../../utility/service/utility.service';
import { MemberRoleEnum } from '../../member/enums/member-role.enum';
import { MemberStatusEnum } from '../../member/enums/member-status.enum';
import { WorkerStatusEnum } from '../../member/enums/worker-status.enum';

const makeQb = () => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  innerJoinAndSelect: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  addOrderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn(),
  getMany: jest.fn(),
  getOne: jest.fn(),
  getRawMany: jest.fn(),
  getRawOne: jest.fn(),
  getCount: jest.fn(),
});

const mockAttendanceRepo = {
  save: jest.fn(),
  create: jest.fn(),
  exists: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockSlotRepo = {
  findOne: jest.fn(),
};

const mockMemberService = {
  getById: jest.fn(),
  count: jest.fn(),
  getMembersNotCheckedInForSlot: jest.fn(),
  getWorkersNotCheckedInForSlot: jest.fn(),
};

const mockEventService = {
  resolveSlotConfig: jest.fn(),
  findSlotsNotMarkedAbsent: jest.fn(),
};

const mockConfigService = {
  get: jest.fn(),
};

const mockDataSource = {
  transaction: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const defaultVenue = { id: 'venue-1', name: 'Main Auditorium', latitude: 6.5244, longitude: 3.3792 };

const defaultConfig = {
  workerCheckinStartOffsetSeconds: -7200,
  workerLateOffsetSeconds: 0,
  memberCheckinStartOffsetSeconds: -3600,
  checkinStopOffsetSeconds: 7200,
  venue: defaultVenue,
  allowedDistanceInMeters: 100,
};

function makeSlot(startTime: Date): any {
  return {
    id: 'slot-1',
    name: 'Sunday Service',
    startTime,
    endTime: moment(startTime).add(3, 'hours').toDate(),
    config: {
      workerCheckinStartOffsetSeconds: -7200,
      workerLateOffsetSeconds: 0,
      memberCheckinStartOffsetSeconds: -3600,
      checkinStopOffsetSeconds: 7200,
      allowedDistanceInMeters: 100,
      defaultVenue,
    },
    venueOverride: null,
    workerCheckinStartOverride: null,
    workerLateOverride: null,
    memberCheckinStartOverride: null,
    checkinStopOverride: null,
    allowedDistanceOverride: null,
    locationLatitude: '6.52440000',
    locationLongitude: '3.37920000',
  };
}

describe('AttendanceService', () => {
  let service: AttendanceService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: getRepositoryToken(Attendance), useValue: mockAttendanceRepo },
        { provide: getRepositoryToken(ServiceSlot), useValue: mockSlotRepo },
        { provide: MemberService, useValue: mockMemberService },
        { provide: EventService, useValue: mockEventService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: DataSource, useValue: mockDataSource },
        { provide: UtilityService, useValue: { sendEmailWithTemplate: jest.fn() } },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
  });

  describe('checkin', () => {
    const user = { id: 'member-1', role: MemberRoleEnum.MEMBER };
    const dto = { serviceSlotId: 'slot-1' };

    it('should throw NotFoundException if slot not found', async () => {
      mockSlotRepo.findOne.mockResolvedValue(null);

      await expect(service.checkin(user, dto as any)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if member is inactive', async () => {
      const now = moment();
      const slot = makeSlot(moment(now).add(1, 'hour').toDate());
      mockSlotRepo.findOne.mockResolvedValue(slot);
      mockMemberService.getById.mockResolvedValue({
        id: 'member-1',
        role: MemberRoleEnum.MEMBER,
        status: MemberStatusEnum.INACTIVE,
        workerProfile: null,
      });
      mockEventService.resolveSlotConfig.mockReturnValue(defaultConfig);

      await expect(service.checkin(user, dto as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if member already checked in', async () => {
      const now = moment();
      const slot = makeSlot(moment(now).add(1, 'hour').toDate());
      mockSlotRepo.findOne.mockResolvedValue(slot);
      mockMemberService.getById.mockResolvedValue({
        id: 'member-1',
        role: MemberRoleEnum.MEMBER,
        status: MemberStatusEnum.ACTIVE,
        workerProfile: null,
      });
      mockEventService.resolveSlotConfig.mockReturnValue(defaultConfig);
      mockAttendanceRepo.exists.mockResolvedValue(true);

      await expect(service.checkin(user, dto as any)).rejects.toThrow(BadRequestException);
    });

    it('should mark PRESENT for a regular member checking in within window', async () => {
      // startTime = 1 hour in future; member window opens 3600s before start = now; close = 2h after start
      const now = moment();
      const startTime = moment(now).add(1, 'hour').toDate();
      const slot = makeSlot(startTime);

      mockSlotRepo.findOne.mockResolvedValue(slot);
      mockMemberService.getById.mockResolvedValue({
        id: 'member-1',
        role: MemberRoleEnum.MEMBER,
        status: MemberStatusEnum.ACTIVE,
        workerProfile: null,
      });
      mockEventService.resolveSlotConfig.mockReturnValue(defaultConfig);
      mockAttendanceRepo.exists.mockResolvedValue(false);
      mockAttendanceRepo.create.mockReturnValue({ status: AttendanceStatusEnum.PRESENT });
      mockAttendanceRepo.save.mockResolvedValue({ id: 'att-1', status: AttendanceStatusEnum.PRESENT });
      mockConfigService.get.mockReturnValue('false');

      const result = await service.checkin({ id: 'member-1', role: MemberRoleEnum.MEMBER }, dto as any);

      expect(result).toEqual({ message: 'Check-in successful' });
      expect(mockAttendanceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: AttendanceStatusEnum.PRESENT }),
      );
    });

    it('should mark PRESENT for worker checking in before late threshold', async () => {
      // startTime = 1 hour in future; workerCheckinStart = -7200s (2h before) = 1h before now = open
      // workerLateOffset = 0 = startTime; now is before startTime so PRESENT
      const now = moment();
      const startTime = moment(now).add(1, 'hour').toDate();
      const slot = makeSlot(startTime);

      mockSlotRepo.findOne.mockResolvedValue(slot);
      mockMemberService.getById.mockResolvedValue({
        id: 'worker-1',
        role: MemberRoleEnum.WORKER,
        status: MemberStatusEnum.ACTIVE,
        workerProfile: { id: 'wp-1', status: WorkerStatusEnum.ACTIVE, department: { id: 'dept-1' } },
      });
      mockEventService.resolveSlotConfig.mockReturnValue(defaultConfig);
      mockAttendanceRepo.exists.mockResolvedValue(false);
      mockAttendanceRepo.create.mockReturnValue({ status: AttendanceStatusEnum.PRESENT });
      mockAttendanceRepo.save.mockResolvedValue({ id: 'att-1', status: AttendanceStatusEnum.PRESENT });
      mockConfigService.get.mockReturnValue('false');

      const result = await service.checkin({ id: 'worker-1', role: MemberRoleEnum.WORKER }, dto as any);

      expect(result).toEqual({ message: 'Check-in successful' });
      expect(mockAttendanceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: AttendanceStatusEnum.PRESENT }),
      );
    });

    it('should mark LATE for worker checking in after late threshold', async () => {
      // startTime = 1 hour ago; workerLateOffset = 0 = 1 hour ago; now is after that = LATE
      // workerCheckinStart = -7200 = 3 hours ago = open; checkinStop = +7200 = 1 hour from now = open
      const now = moment();
      const startTime = moment(now).subtract(1, 'hour').toDate();
      const cfg = {
        ...defaultConfig,
        workerLateOffsetSeconds: 0,
      };
      const slot = makeSlot(startTime);

      mockSlotRepo.findOne.mockResolvedValue(slot);
      mockMemberService.getById.mockResolvedValue({
        id: 'worker-1',
        role: MemberRoleEnum.WORKER,
        status: MemberStatusEnum.ACTIVE,
        workerProfile: { id: 'wp-1', status: WorkerStatusEnum.ACTIVE, department: { id: 'dept-1' } },
      });
      mockEventService.resolveSlotConfig.mockReturnValue(cfg);
      mockAttendanceRepo.exists.mockResolvedValue(false);
      mockAttendanceRepo.create.mockReturnValue({ status: AttendanceStatusEnum.LATE });
      mockAttendanceRepo.save.mockResolvedValue({ id: 'att-1', status: AttendanceStatusEnum.LATE });
      mockConfigService.get.mockReturnValue('false');

      const result = await service.checkin({ id: 'worker-1', role: MemberRoleEnum.WORKER }, dto as any);

      expect(result).toEqual({ message: 'Check-in successful' });
      expect(mockAttendanceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: AttendanceStatusEnum.LATE }),
      );
    });
  });

  describe('getMyHistory', () => {
    it('should throw BadRequestException if page < 1', async () => {
      await expect(
        service.getMyHistory({ id: 'member-1', role: MemberRoleEnum.MEMBER }, 0),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return paginated attendance history', async () => {
      const qb = makeQb();
      qb.getManyAndCount.mockResolvedValue([[{ id: 'att-1' }], 1]);
      mockAttendanceRepo.createQueryBuilder.mockReturnValue(qb);
      jest.spyOn(UtilityService, 'createPaginationResponse').mockReturnValue({
        data: [{ id: 'att-1' } as any],
        page: 1,
        limit: 10,
        totalCount: 1,
        totalPages: 1,
      });

      const result = await service.getMyHistory({ id: 'member-1', role: MemberRoleEnum.MEMBER }, 1, 10);

      expect(result.data).toHaveLength(1);
      expect(result.page).toBe(1);
    });

    it('should apply status filter when provided', async () => {
      const qb = makeQb();
      qb.getManyAndCount.mockResolvedValue([[], 0]);
      mockAttendanceRepo.createQueryBuilder.mockReturnValue(qb);
      jest.spyOn(UtilityService, 'createPaginationResponse').mockReturnValue({
        data: [],
        page: 1,
        limit: 10,
        totalCount: 0,
        totalPages: 1,
      });

      await service.getMyHistory(
        { id: 'member-1', role: MemberRoleEnum.MEMBER },
        1,
        10,
        AttendanceStatusEnum.PRESENT,
      );

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('attendance.status'),
        expect.objectContaining({ status: AttendanceStatusEnum.PRESENT }),
      );
    });
  });

  describe('getWorkerAttendancePercentage', () => {
    it('should return 0 if no workers exist', async () => {
      mockMemberService.count.mockResolvedValue(0);

      const result = await service.getWorkerAttendancePercentage(30);

      expect(result).toBe(0);
    });

    it('should calculate percentage based on attended workers', async () => {
      mockMemberService.count.mockResolvedValue(10);

      const qb = makeQb();
      qb.getRawOne.mockResolvedValue({ count: '8' });
      mockAttendanceRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getWorkerAttendancePercentage(30);

      expect(result).toBe(80);
    });

    it('should cap percentage at 100 even if count exceeds total', async () => {
      mockMemberService.count.mockResolvedValue(5);

      const qb = makeQb();
      qb.getRawOne.mockResolvedValue({ count: '10' });
      mockAttendanceRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getWorkerAttendancePercentage(30);

      expect(result).toBe(100);
    });
  });

  describe('getPersonalAttendancePercentage', () => {
    it('should return 0 if member has no attendance records in the period', async () => {
      const qb = makeQb();
      qb.getRawOne.mockResolvedValue({ total: '0', attended: '0' });
      mockAttendanceRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getPersonalAttendancePercentage('member-1', 30);

      expect(result).toBe(0);
    });

    it('should calculate ratio of present/late records to total', async () => {
      const qb = makeQb();
      qb.getRawOne.mockResolvedValue({ total: '10', attended: '8' });
      mockAttendanceRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getPersonalAttendancePercentage('member-1', 30);

      expect(result).toBe(80);
    });
  });
});
