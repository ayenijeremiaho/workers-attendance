import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ExternalPayeeService } from './external-payee.service';
import { ExternalPayee } from '../entity/external-payee.entity';
import { ExternalPayeeType } from '../enum/finance.enum';
import { AuditLogService } from '../../utility/service/audit-log.service';

const mockAdmin = { id: 'admin-1' } as any;

const mockRepo = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
};

const mockAuditLogService = { log: jest.fn() };

describe('ExternalPayeeService', () => {
  let service: ExternalPayeeService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExternalPayeeService,
        { provide: getRepositoryToken(ExternalPayee), useValue: mockRepo },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();
    service = module.get<ExternalPayeeService>(ExternalPayeeService);
  });

  describe('create', () => {
    it('creates a new external payee', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const payee = {
        id: 'ep-1',
        name: 'Global Mission',
        type: ExternalPayeeType.MISSION,
      };
      mockRepo.create.mockReturnValue(payee);
      mockRepo.save.mockResolvedValue(payee);

      const result = await service.create(
        { name: 'Global Mission', type: ExternalPayeeType.MISSION },
        mockAdmin,
      );
      expect(result.id).toBe('ep-1');
    });

    it('throws ConflictException on duplicate name', async () => {
      mockRepo.findOne.mockResolvedValue({ id: 'ep-1' });
      await expect(
        service.create(
          { name: 'Global Mission', type: ExternalPayeeType.MISSION },
          mockAdmin,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
