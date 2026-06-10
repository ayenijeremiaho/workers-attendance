import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { MemberService } from './member.service';
import { Member } from '../entity/member.entity';
import { WorkerProfile } from '../entity/worker-profile.entity';
import { Department } from '../../department/entity/department.entity';
import { UtilityService } from '../../utility/service/utility.service';
import { MemberRoleEnum } from '../enums/member-role.enum';
import { MemberStatusEnum } from '../enums/member-status.enum';
import { WorkerStatusEnum } from '../enums/worker-status.enum';

const mockMemberRepo = {
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  exists: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockWorkerProfileRepo = {
  save: jest.fn(),
  create: jest.fn(),
  remove: jest.fn(),
  findOne: jest.fn(),
};

const mockDepartmentRepo = {
  findOneBy: jest.fn(),
};

const mockUtilityService = {
  sendEmailWithTemplate: jest.fn(),
  sendEmail: jest.fn(),
};

describe('MemberService', () => {
  let service: MemberService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemberService,
        { provide: getRepositoryToken(Member), useValue: mockMemberRepo },
        { provide: getRepositoryToken(WorkerProfile), useValue: mockWorkerProfileRepo },
        { provide: getRepositoryToken(Department), useValue: mockDepartmentRepo },
        { provide: UtilityService, useValue: mockUtilityService },
      ],
    }).compile();

    service = module.get<MemberService>(MemberService);
  });

  describe('signup', () => {
    it('should throw ConflictException when email already exists', async () => {
      mockMemberRepo.exists.mockResolvedValue(true);

      await expect(
        service.signup({
          email: 'existing@test.com',
          password: 'pass',
          firstname: 'John',
          lastname: 'Doe',
        } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should save member with MEMBER role and ACTIVE status on success', async () => {
      mockMemberRepo.exists.mockResolvedValue(false);
      jest.spyOn(UtilityService, 'hashValue').mockResolvedValue('hashed_pass');
      jest.spyOn(UtilityService, 'capitalizeFirstLetter').mockReturnValue('John');

      const createdMember = {
        id: 'uuid-1',
        email: 'new@test.com',
        firstname: 'john',
        role: MemberRoleEnum.MEMBER,
        status: MemberStatusEnum.ACTIVE,
      };
      mockMemberRepo.create.mockReturnValue(createdMember);
      mockMemberRepo.save.mockResolvedValue(createdMember);

      const result = await service.signup({
        email: 'new@test.com',
        password: 'pass123',
        firstname: 'john',
        lastname: 'doe',
      } as any);

      expect(mockMemberRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: MemberRoleEnum.MEMBER,
          status: MemberStatusEnum.ACTIVE,
          password: 'hashed_pass',
        }),
      );
      expect(mockMemberRepo.save).toHaveBeenCalledWith(createdMember);
      expect(result.role).toBe(MemberRoleEnum.MEMBER);
      expect(result.status).toBe(MemberStatusEnum.ACTIVE);
    });

    it('should send welcome email after successful signup', async () => {
      mockMemberRepo.exists.mockResolvedValue(false);
      jest.spyOn(UtilityService, 'hashValue').mockResolvedValue('hashed_pass');
      jest.spyOn(UtilityService, 'capitalizeFirstLetter').mockReturnValue('John');

      const savedMember = { id: 'uuid-1', email: 'new@test.com', firstname: 'john' };
      mockMemberRepo.create.mockReturnValue(savedMember);
      mockMemberRepo.save.mockResolvedValue(savedMember);

      await service.signup({ email: 'new@test.com', password: 'pass', firstname: 'john', lastname: 'doe' } as any);

      expect(mockUtilityService.sendEmailWithTemplate).toHaveBeenCalledWith(
        savedMember.email,
        expect.any(String),
        'welcome-member',
        expect.any(Object),
      );
    });
  });

  describe('createAdmin', () => {
    it('should save member with ADMIN role on success', async () => {
      mockMemberRepo.exists.mockResolvedValue(false);
      jest.spyOn(UtilityService, 'hashValue').mockResolvedValue('hashed_pass');

      const adminMember = {
        id: 'admin-uuid',
        email: 'admin@test.com',
        role: MemberRoleEnum.ADMIN,
        status: MemberStatusEnum.ACTIVE,
      };
      mockMemberRepo.create.mockReturnValue(adminMember);
      mockMemberRepo.save.mockResolvedValue(adminMember);

      const result = await service.createAdmin({
        email: 'admin@test.com',
        password: 'admin_pass',
        firstname: 'Admin',
        lastname: 'User',
        phoneNumber: '1234567890',
      } as any);

      expect(mockMemberRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: MemberRoleEnum.ADMIN }),
      );
      expect(result.role).toBe(MemberRoleEnum.ADMIN);
    });

    it('should throw ConflictException when email already exists for admin', async () => {
      mockMemberRepo.exists.mockResolvedValue(true);

      await expect(
        service.createAdmin({ email: 'taken@test.com', password: 'p', firstname: 'A', lastname: 'B' } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should hash password before saving admin', async () => {
      mockMemberRepo.exists.mockResolvedValue(false);
      const hashSpy = jest.spyOn(UtilityService, 'hashValue').mockResolvedValue('hashed_admin_pass');
      const adminMember = { id: 'admin-uuid', email: 'admin@test.com' };
      mockMemberRepo.create.mockReturnValue(adminMember);
      mockMemberRepo.save.mockResolvedValue(adminMember);

      await service.createAdmin({ email: 'admin@test.com', password: 'raw_pass', firstname: 'A', lastname: 'B' } as any);

      expect(hashSpy).toHaveBeenCalledWith('raw_pass');
      expect(mockMemberRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ password: 'hashed_admin_pass' }),
      );
    });
  });

  describe('promoteToWorker', () => {
    it('should throw BadRequestException if member is already a worker', async () => {
      const memberWithProfile = {
        id: 'member-1',
        role: MemberRoleEnum.WORKER,
        workerProfile: { id: 'wp-1' },
      };
      mockMemberRepo.findOne.mockResolvedValue(memberWithProfile);

      await expect(service.promoteToWorker('member-1', { departmentId: 'dept-1' } as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if department not found', async () => {
      const member = { id: 'member-1', role: MemberRoleEnum.MEMBER, workerProfile: null };
      mockMemberRepo.findOne.mockResolvedValue(member);
      mockDepartmentRepo.findOneBy.mockResolvedValue(null);

      await expect(service.promoteToWorker('member-1', { departmentId: 'nonexistent-dept' } as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should set role to WORKER and create worker profile on success', async () => {
      const member = {
        id: 'member-1',
        email: 'worker@test.com',
        firstname: 'Jane',
        lastname: 'Doe',
        role: MemberRoleEnum.MEMBER,
        workerProfile: null,
      };
      const department = { id: 'dept-1', name: 'Music' };
      const workerProfile = { id: 'wp-1', status: WorkerStatusEnum.ACTIVE };
      const updatedMember = { ...member, role: MemberRoleEnum.WORKER, workerProfile };

      mockMemberRepo.findOne
        .mockResolvedValueOnce(member)
        .mockResolvedValueOnce(updatedMember);
      mockDepartmentRepo.findOneBy.mockResolvedValue(department);
      mockWorkerProfileRepo.create.mockReturnValue(workerProfile);
      mockWorkerProfileRepo.save.mockResolvedValue(workerProfile);
      mockMemberRepo.save.mockResolvedValue({ ...member, role: MemberRoleEnum.WORKER });
      jest.spyOn(UtilityService, 'capitalizeFirstLetter').mockReturnValue('Jane');

      const result = await service.promoteToWorker('member-1', { departmentId: 'dept-1' } as any);

      expect(mockWorkerProfileRepo.save).toHaveBeenCalled();
      expect(mockMemberRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ role: MemberRoleEnum.WORKER }),
      );
      expect(result.role).toBe(MemberRoleEnum.WORKER);
    });
  });

  describe('revokeWorker', () => {
    it('should throw BadRequestException if member is not a worker', async () => {
      const member = { id: 'member-1', role: MemberRoleEnum.MEMBER, workerProfile: null };
      mockMemberRepo.findOne.mockResolvedValue(member);

      await expect(service.revokeWorker('member-1')).rejects.toThrow(BadRequestException);
    });

    it('should remove workerProfile and set role to MEMBER', async () => {
      const workerProfile = { id: 'wp-1' };
      const member = {
        id: 'member-1',
        email: 'worker@test.com',
        role: MemberRoleEnum.WORKER,
        workerProfile,
      };
      mockMemberRepo.findOne.mockResolvedValue(member);
      mockWorkerProfileRepo.remove.mockResolvedValue(undefined);
      mockMemberRepo.save.mockResolvedValue({ ...member, role: MemberRoleEnum.MEMBER, workerProfile: null });

      await service.revokeWorker('member-1');

      expect(mockWorkerProfileRepo.remove).toHaveBeenCalledWith(workerProfile);
      expect(mockMemberRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ role: MemberRoleEnum.MEMBER }),
      );
    });

    it('should throw NotFoundException when member does not exist', async () => {
      mockMemberRepo.findOne.mockResolvedValue(null);

      await expect(service.revokeWorker('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('changeStatus', () => {
    it('should throw BadRequestException if status is unchanged', async () => {
      const member = { id: 'member-1', status: MemberStatusEnum.ACTIVE };
      mockMemberRepo.findOne.mockResolvedValue(member);

      await expect(service.changeStatus('member-1', MemberStatusEnum.ACTIVE)).rejects.toThrow(BadRequestException);
    });

    it('should update member status when different', async () => {
      const member = { id: 'member-1', status: MemberStatusEnum.ACTIVE };
      mockMemberRepo.findOne.mockResolvedValue(member);
      mockMemberRepo.save.mockResolvedValue({ ...member, status: MemberStatusEnum.INACTIVE });

      await service.changeStatus('member-1', MemberStatusEnum.INACTIVE);

      expect(mockMemberRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: MemberStatusEnum.INACTIVE }),
      );
    });

    it('should throw NotFoundException when member not found for status change', async () => {
      mockMemberRepo.findOne.mockResolvedValue(null);

      await expect(service.changeStatus('nonexistent', MemberStatusEnum.INACTIVE)).rejects.toThrow(NotFoundException);
    });
  });

  describe('changePassword', () => {
    it('should throw BadRequestException if old password is wrong', async () => {
      const member = { id: 'member-1', password: 'hashed_current' };
      mockMemberRepo.findOne.mockResolvedValue(member);
      jest.spyOn(UtilityService, 'verifyHashedValue').mockResolvedValue(false);

      await expect(
        service.changePassword('member-1', {
          oldPassword: 'wrong_pass',
          newPassword: 'new_pass',
          confirmPassword: 'new_pass',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if confirm password does not match new password', async () => {
      const member = { id: 'member-1', password: 'hashed_current' };
      mockMemberRepo.findOne.mockResolvedValue(member);
      jest.spyOn(UtilityService, 'verifyHashedValue').mockResolvedValue(true);

      await expect(
        service.changePassword('member-1', {
          oldPassword: 'current_pass',
          newPassword: 'new_pass',
          confirmPassword: 'different_pass',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update password on success', async () => {
      const member = { id: 'member-1', password: 'hashed_current', changedPassword: false };
      mockMemberRepo.findOne.mockResolvedValue(member);
      jest.spyOn(UtilityService, 'verifyHashedValue').mockResolvedValue(true);
      jest.spyOn(UtilityService, 'hashValue').mockResolvedValue('hashed_new_pass');
      mockMemberRepo.save.mockResolvedValue({ ...member, password: 'hashed_new_pass', changedPassword: true });

      const result = await service.changePassword('member-1', {
        oldPassword: 'current_pass',
        newPassword: 'new_pass',
        confirmPassword: 'new_pass',
      });

      expect(mockMemberRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ password: 'hashed_new_pass', changedPassword: true }),
      );
      expect(result).toBe('Password changed successfully');
    });
  });

  describe('getById', () => {
    it('should throw NotFoundException when member not found', async () => {
      mockMemberRepo.findOne.mockResolvedValue(null);

      await expect(service.getById('nonexistent-id')).rejects.toThrow(NotFoundException);
    });

    it('should return member when found', async () => {
      const member = { id: 'member-1', email: 'test@test.com', role: MemberRoleEnum.MEMBER };
      mockMemberRepo.findOne.mockResolvedValue(member);

      const result = await service.getById('member-1');

      expect(result).toEqual(member);
      expect(mockMemberRepo.findOne).toHaveBeenCalledWith({ where: { id: 'member-1' }, relations: [] });
    });

    it('should pass relations to findOne', async () => {
      const member = { id: 'member-1', workerProfile: { id: 'wp-1' } };
      mockMemberRepo.findOne.mockResolvedValue(member);

      await service.getById('member-1', ['workerProfile']);

      expect(mockMemberRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'member-1' },
        relations: ['workerProfile'],
      });
    });
  });
});
