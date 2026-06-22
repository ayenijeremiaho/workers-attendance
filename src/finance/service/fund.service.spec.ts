import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { FundService } from './fund.service';
import { Fund } from '../entity/fund.entity';
import { FundType } from '../enum/finance.enum';
import { AuditLogService } from '../../utility/service/audit-log.service';

const mockAdmin = { id: 'admin-1' } as any;

const mockFundRepo = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
};

const mockAuditLogService = { log: jest.fn() };

describe('FundService', () => {
  let service: FundService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FundService,
        { provide: getRepositoryToken(Fund), useValue: mockFundRepo },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();
    service = module.get<FundService>(FundService);
  });

  describe('create', () => {
    it('creates a new fund', async () => {
      mockFundRepo.findOne.mockResolvedValue(null);
      const fund = { id: 'f-1', name: 'General', type: FundType.UNRESTRICTED };
      mockFundRepo.create.mockReturnValue(fund);
      mockFundRepo.save.mockResolvedValue(fund);

      const result = await service.create(
        { name: 'General', type: FundType.UNRESTRICTED },
        mockAdmin,
      );
      expect(result).toEqual(fund);
      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        'FUND_CREATED',
        expect.any(Object),
      );
    });

    it('throws ConflictException when name already exists', async () => {
      mockFundRepo.findOne.mockResolvedValue({ id: 'f-1', name: 'General' });
      await expect(
        service.create(
          { name: 'General', type: FundType.UNRESTRICTED },
          mockAdmin,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('returns fund when found', async () => {
      const fund = { id: 'f-1', name: 'General' };
      mockFundRepo.findOne.mockResolvedValue(fund);
      await expect(service.findOne('f-1')).resolves.toEqual(fund);
    });

    it('throws NotFoundException when not found', async () => {
      mockFundRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('updates fund fields', async () => {
      const fund = {
        id: 'f-1',
        name: 'General',
        description: null,
        isActive: true,
      };
      mockFundRepo.findOne.mockResolvedValue(fund);
      mockFundRepo.save.mockResolvedValue({ ...fund, name: 'Updated' });

      const result = await service.update(
        'f-1',
        { name: 'Updated' },
        mockAdmin,
      );
      expect(result.name).toBe('Updated');
      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        'FUND_UPDATED',
        expect.any(Object),
      );
    });
  });
});
