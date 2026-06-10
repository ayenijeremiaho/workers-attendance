import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AnnouncementService } from './announcement.service';
import { Announcement } from '../entity/announcement.entity';
import { AnnouncementAudienceEnum } from '../enum/announcement-audience.enum';
import { MemberRoleEnum } from '../../member/enums/member-role.enum';
import { UtilityService } from '../../utility/service/utility.service';

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

const mockAnnouncementRepo = {
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(),
};

describe('AnnouncementService', () => {
  let service: AnnouncementService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnnouncementService,
        { provide: getRepositoryToken(Announcement), useValue: mockAnnouncementRepo },
      ],
    }).compile();

    service = module.get<AnnouncementService>(AnnouncementService);
  });

  describe('create', () => {
    it('should throw BadRequestException if audience is DEPARTMENT but no departmentId provided', async () => {
      await expect(
        service.create(
          {
            title: 'Dept Announcement',
            body: 'For the music department',
            audience: AnnouncementAudienceEnum.DEPARTMENT,
          } as any,
          'author-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should save announcement with publishedAt defaulting to now when not specified', async () => {
      const before = new Date();
      const announcement = {
        id: 'ann-1',
        title: 'General Announcement',
        body: 'Hello everyone',
        audience: AnnouncementAudienceEnum.ALL,
        publishedAt: new Date(),
      };
      mockAnnouncementRepo.create.mockReturnValue(announcement);
      mockAnnouncementRepo.save.mockResolvedValue(announcement);

      const result = await service.create(
        { title: 'General Announcement', body: 'Hello everyone' } as any,
        'author-1',
      );

      const createCall = mockAnnouncementRepo.create.mock.calls[0][0];
      expect(createCall.publishedAt).toBeInstanceOf(Date);
      expect(createCall.publishedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('should save announcement for DEPARTMENT audience when departmentId is provided', async () => {
      const announcement = {
        id: 'ann-1',
        title: 'Music Dept',
        body: 'Meeting at 10am',
        audience: AnnouncementAudienceEnum.DEPARTMENT,
        department: { id: 'dept-1' },
      };
      mockAnnouncementRepo.create.mockReturnValue(announcement);
      mockAnnouncementRepo.save.mockResolvedValue(announcement);

      const result = await service.create(
        {
          title: 'Music Dept',
          body: 'Meeting at 10am',
          audience: AnnouncementAudienceEnum.DEPARTMENT,
          departmentId: 'dept-1',
        } as any,
        'author-1',
      );

      expect(mockAnnouncementRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ department: { id: 'dept-1' } }),
      );
      expect(result).toMatchObject({ id: 'ann-1' });
    });

    it('should use provided publishedAt date when specified', async () => {
      const publishDate = '2025-07-01T10:00:00.000Z';
      const announcement = {
        id: 'ann-1',
        title: 'Scheduled',
        publishedAt: new Date(publishDate),
      };
      mockAnnouncementRepo.create.mockReturnValue(announcement);
      mockAnnouncementRepo.save.mockResolvedValue(announcement);

      await service.create(
        { title: 'Scheduled', body: 'Future announcement', publishedAt: publishDate } as any,
        'author-1',
      );

      expect(mockAnnouncementRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ publishedAt: new Date(publishDate) }),
      );
    });
  });

  describe('getForMember', () => {
    it('should filter to only ALL audience for MEMBER role', async () => {
      const qb = makeQb();
      qb.getManyAndCount.mockResolvedValue([[], 0]);
      mockAnnouncementRepo.createQueryBuilder.mockReturnValue(qb);
      jest.spyOn(UtilityService, 'createPaginationResponse').mockReturnValue({
        data: [],
        page: 1,
        limit: 10,
        totalCount: 0,
        totalPages: 1,
      });

      await service.getForMember('member-1', MemberRoleEnum.MEMBER, null, 1, 10);

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('audience'),
        expect.objectContaining({ all: AnnouncementAudienceEnum.ALL }),
      );
    });

    it('should allow WORKER role to see ALL, WORKERS_ONLY, and their dept announcements', async () => {
      const qb = makeQb();
      qb.getManyAndCount.mockResolvedValue([[{ id: 'ann-1' }], 1]);
      mockAnnouncementRepo.createQueryBuilder.mockReturnValue(qb);
      jest.spyOn(UtilityService, 'createPaginationResponse').mockReturnValue({
        data: [{ id: 'ann-1' } as any],
        page: 1,
        limit: 10,
        totalCount: 1,
        totalPages: 1,
      });

      await service.getForMember('worker-1', MemberRoleEnum.WORKER, 'dept-1', 1, 10);

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('audience'),
        expect.objectContaining({
          all: AnnouncementAudienceEnum.ALL,
          workers: AnnouncementAudienceEnum.WORKERS_ONLY,
          dept: AnnouncementAudienceEnum.DEPARTMENT,
          departmentId: 'dept-1',
        }),
      );
    });

    it('should exclude expired announcements by filtering expiresAt', async () => {
      const qb = makeQb();
      qb.getManyAndCount.mockResolvedValue([[], 0]);
      mockAnnouncementRepo.createQueryBuilder.mockReturnValue(qb);
      jest.spyOn(UtilityService, 'createPaginationResponse').mockReturnValue({
        data: [],
        page: 1,
        limit: 10,
        totalCount: 0,
        totalPages: 1,
      });

      await service.getForMember('member-1', MemberRoleEnum.MEMBER, null, 1, 10);

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('expiresAt'),
        expect.objectContaining({ now: expect.any(Date) }),
      );
    });

    it('should return paginated results', async () => {
      const qb = makeQb();
      qb.getManyAndCount.mockResolvedValue([[{ id: 'ann-1' }, { id: 'ann-2' }], 2]);
      mockAnnouncementRepo.createQueryBuilder.mockReturnValue(qb);
      jest.spyOn(UtilityService, 'createPaginationResponse').mockReturnValue({
        data: [{ id: 'ann-1' } as any, { id: 'ann-2' } as any],
        page: 1,
        limit: 10,
        totalCount: 2,
        totalPages: 1,
      });

      const result = await service.getForMember('admin-1', MemberRoleEnum.ADMIN, null, 1, 10);

      expect(result.totalCount).toBe(2);
      expect(result.data).toHaveLength(2);
    });
  });

  describe('delete', () => {
    it('should throw NotFoundException if announcement not found', async () => {
      mockAnnouncementRepo.findOne.mockResolvedValue(null);

      await expect(service.delete('nonexistent-id')).rejects.toThrow(NotFoundException);
    });

    it('should remove announcement when found', async () => {
      const announcement = { id: 'ann-1', title: 'Test', body: 'Content' };
      mockAnnouncementRepo.findOne.mockResolvedValue(announcement);
      mockAnnouncementRepo.remove.mockResolvedValue(undefined);

      await service.delete('ann-1');

      expect(mockAnnouncementRepo.remove).toHaveBeenCalledWith(announcement);
    });

    it('should call findOne with correct id and relations', async () => {
      mockAnnouncementRepo.findOne.mockResolvedValue(null);

      await expect(service.delete('ann-1')).rejects.toThrow(NotFoundException);

      expect(mockAnnouncementRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'ann-1' },
        relations: ['author', 'department', 'targetMember'],
      });
    });
  });
});
