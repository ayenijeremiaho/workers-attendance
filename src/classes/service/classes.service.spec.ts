import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ClassesService } from './classes.service';
import { ChurchClass } from '../entity/church-class.entity';
import { ClassEnrollment } from '../entity/class-enrollment.entity';
import { Member } from '../../member/entity/member.entity';
import { EnrollmentStatusEnum } from '../enum/enrollment-status.enum';
import { ChurchClassTypeEnum } from '../enum/church-class-type.enum';

const makeQb = () => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn(),
  getMany: jest.fn(),
});

const mockClassRepo = {
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockEnrollmentRepo = {
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
};

const mockMemberRepo = {
  findOne: jest.fn(),
};

describe('ClassesService', () => {
  let service: ClassesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassesService,
        { provide: getRepositoryToken(ChurchClass), useValue: mockClassRepo },
        { provide: getRepositoryToken(ClassEnrollment), useValue: mockEnrollmentRepo },
        { provide: getRepositoryToken(Member), useValue: mockMemberRepo },
      ],
    }).compile();

    service = module.get<ClassesService>(ClassesService);
  });

  describe('createClass', () => {
    it('should create and save church class', async () => {
      const dto = {
        name: 'New Believers',
        type: ChurchClassTypeEnum.BELIEVERS,
        description: 'Intro class',
      };
      const classObj = { id: 'class-1', ...dto };
      mockClassRepo.create.mockReturnValue(classObj);
      mockClassRepo.save.mockResolvedValue(classObj);

      const result = await service.createClass(dto as any);

      expect(mockClassRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: dto.name, type: dto.type }),
      );
      expect(mockClassRepo.save).toHaveBeenCalledWith(classObj);
      expect(result).toMatchObject({ id: 'class-1' });
    });

    it('should set facilitator to null when no facilitatorId provided', async () => {
      const dto = { name: 'Class', type: ChurchClassTypeEnum.BELIEVERS };
      mockClassRepo.create.mockReturnValue({ ...dto, facilitator: null });
      mockClassRepo.save.mockResolvedValue({ id: 'class-1', ...dto, facilitator: null });

      await service.createClass(dto as any);

      expect(mockClassRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ facilitator: null }),
      );
    });

    it('should set facilitator as reference when facilitatorId provided', async () => {
      const dto = { name: 'Class', type: ChurchClassTypeEnum.BELIEVERS, facilitatorId: 'member-1' };
      mockClassRepo.create.mockReturnValue({ ...dto, facilitator: { id: 'member-1' } });
      mockClassRepo.save.mockResolvedValue({ id: 'class-1', facilitator: { id: 'member-1' } });

      await service.createClass(dto as any);

      expect(mockClassRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ facilitator: { id: 'member-1' } }),
      );
    });
  });

  describe('enrollMember', () => {
    it('should throw BadRequestException if member is already enrolled', async () => {
      mockEnrollmentRepo.findOne.mockResolvedValue({ id: 'enroll-1', status: EnrollmentStatusEnum.IN_PROGRESS });

      await expect(
        service.enrollMember({ memberId: 'member-1', classId: 'class-1' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create enrollment with IN_PROGRESS status on success', async () => {
      mockEnrollmentRepo.findOne.mockResolvedValue(null);
      const enrollment = {
        id: 'enroll-1',
        member: { id: 'member-1' },
        churchClass: { id: 'class-1' },
        status: EnrollmentStatusEnum.IN_PROGRESS,
      };
      mockEnrollmentRepo.create.mockReturnValue(enrollment);
      mockEnrollmentRepo.save.mockResolvedValue(enrollment);

      const result = await service.enrollMember({ memberId: 'member-1', classId: 'class-1' } as any);

      expect(mockEnrollmentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          member: { id: 'member-1' },
          churchClass: { id: 'class-1' },
          status: EnrollmentStatusEnum.IN_PROGRESS,
        }),
      );
      expect(result.status).toBe(EnrollmentStatusEnum.IN_PROGRESS);
    });

    it('should save the new enrollment to the repository', async () => {
      mockEnrollmentRepo.findOne.mockResolvedValue(null);
      const enrollment = { id: 'enroll-1', status: EnrollmentStatusEnum.IN_PROGRESS };
      mockEnrollmentRepo.create.mockReturnValue(enrollment);
      mockEnrollmentRepo.save.mockResolvedValue(enrollment);

      await service.enrollMember({ memberId: 'member-1', classId: 'class-1' } as any);

      expect(mockEnrollmentRepo.save).toHaveBeenCalledWith(enrollment);
    });
  });

  describe('updateEnrollmentStatus', () => {
    it('should throw NotFoundException if enrollment not found', async () => {
      mockEnrollmentRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateEnrollmentStatus('nonexistent', EnrollmentStatusEnum.COMPLETED),
      ).rejects.toThrow(NotFoundException);
    });

    it('should set completedAt when status is COMPLETED', async () => {
      const enrollment = {
        id: 'enroll-1',
        status: EnrollmentStatusEnum.IN_PROGRESS,
        completedAt: null,
        cancelledAt: null,
      };
      mockEnrollmentRepo.findOne.mockResolvedValue(enrollment);
      mockEnrollmentRepo.save.mockImplementation((e) => Promise.resolve(e));

      const result = await service.updateEnrollmentStatus('enroll-1', EnrollmentStatusEnum.COMPLETED);

      expect(result.status).toBe(EnrollmentStatusEnum.COMPLETED);
      expect(result.completedAt).not.toBeNull();
      expect(result.cancelledAt).toBeNull();
    });

    it('should set cancelledAt when status is CANCELLED', async () => {
      const enrollment = {
        id: 'enroll-1',
        status: EnrollmentStatusEnum.IN_PROGRESS,
        completedAt: null,
        cancelledAt: null,
      };
      mockEnrollmentRepo.findOne.mockResolvedValue(enrollment);
      mockEnrollmentRepo.save.mockImplementation((e) => Promise.resolve(e));

      const result = await service.updateEnrollmentStatus('enroll-1', EnrollmentStatusEnum.CANCELLED);

      expect(result.status).toBe(EnrollmentStatusEnum.CANCELLED);
      expect(result.cancelledAt).not.toBeNull();
      expect(result.completedAt).toBeNull();
    });

    it('should save the updated enrollment', async () => {
      const enrollment = { id: 'enroll-1', status: EnrollmentStatusEnum.IN_PROGRESS, completedAt: null, cancelledAt: null };
      mockEnrollmentRepo.findOne.mockResolvedValue(enrollment);
      mockEnrollmentRepo.save.mockImplementation((e) => Promise.resolve(e));

      await service.updateEnrollmentStatus('enroll-1', EnrollmentStatusEnum.COMPLETED);

      expect(mockEnrollmentRepo.save).toHaveBeenCalled();
    });
  });

  describe('getMyEnrollments', () => {
    it('should call enrollmentRepo.find with correct where condition', async () => {
      const enrollments = [
        { id: 'enroll-1', member: { id: 'member-1' }, churchClass: { id: 'class-1' } },
      ];
      mockEnrollmentRepo.find.mockResolvedValue(enrollments);

      const result = await service.getMyEnrollments('member-1');

      expect(mockEnrollmentRepo.find).toHaveBeenCalledWith({
        where: { member: { id: 'member-1' } },
        relations: ['churchClass'],
        order: { enrolledAt: 'DESC' },
      });
      expect(result).toEqual(enrollments);
    });

    it('should return empty array when member has no enrollments', async () => {
      mockEnrollmentRepo.find.mockResolvedValue([]);

      const result = await service.getMyEnrollments('member-no-classes');

      expect(result).toEqual([]);
    });

    it('should return all enrollments for the member', async () => {
      const enrollments = [
        { id: 'enroll-1' },
        { id: 'enroll-2' },
        { id: 'enroll-3' },
      ];
      mockEnrollmentRepo.find.mockResolvedValue(enrollments);

      const result = await service.getMyEnrollments('member-1');

      expect(result).toHaveLength(3);
    });
  });
});
