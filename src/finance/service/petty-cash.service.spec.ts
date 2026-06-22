import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PettyCashService } from './petty-cash.service';
import { PettyCashReplenishment } from '../entity/petty-cash-replenishment.entity';
import { JournalEntry } from '../entity/journal-entry.entity';
import { JournalEntryLine } from '../entity/journal-entry-line.entity';
import { AccountingPeriod } from '../entity/accounting-period.entity';
import { PettyCashReplenishmentStatus } from '../enum/finance.enum';
import { AuditLogService } from '../../utility/service/audit-log.service';

const mockAdmin = { id: 'admin-1' } as any;

const mockRepo = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  findAndCount: jest.fn().mockResolvedValue([[], 0]),
};

const mockJournalEntryRepo = {
  findOne: jest.fn().mockResolvedValue(null),
  create: jest.fn().mockReturnValue({ id: 'je-1' }),
  save: jest.fn().mockResolvedValue({ id: 'je-1' }),
};

const mockJournalEntryLineRepo = {
  create: jest.fn().mockReturnValue({}),
  save: jest.fn().mockResolvedValue([]),
};

const mockPeriodRepo = {
  findOne: jest.fn().mockResolvedValue({ id: 'period-1' }),
};

const mockAuditLogService = { log: jest.fn() };

describe('PettyCashService', () => {
  let service: PettyCashService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockJournalEntryRepo.findOne.mockResolvedValue(null);
    mockJournalEntryRepo.save.mockResolvedValue({ id: 'je-1' });
    mockPeriodRepo.findOne.mockResolvedValue({ id: 'period-1' });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PettyCashService,
        {
          provide: getRepositoryToken(PettyCashReplenishment),
          useValue: mockRepo,
        },
        {
          provide: getRepositoryToken(JournalEntry),
          useValue: mockJournalEntryRepo,
        },
        {
          provide: getRepositoryToken(JournalEntryLine),
          useValue: mockJournalEntryLineRepo,
        },
        {
          provide: getRepositoryToken(AccountingPeriod),
          useValue: mockPeriodRepo,
        },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();
    service = module.get<PettyCashService>(PettyCashService);
  });

  describe('create', () => {
    it('creates a pending replenishment request', async () => {
      const r = {
        id: 'r-1',
        amount: 5000,
        status: PettyCashReplenishmentStatus.PENDING,
      };
      mockRepo.create.mockReturnValue(r);
      mockRepo.save.mockResolvedValue(r);

      const result = await service.create(
        { fromAccountId: 'a-1', toCashAccountId: 'a-2', amount: 5000 },
        mockAdmin,
      );
      expect(result.status).toBe(PettyCashReplenishmentStatus.PENDING);
    });
  });

  describe('approve', () => {
    it('approves a pending replenishment and creates journal entry', async () => {
      const r = {
        id: 'r-1',
        status: PettyCashReplenishmentStatus.PENDING,
        requestedBy: { id: 'admin-2' },
        approvedBy: null,
        approvedAt: null,
        notes: null,
        fromAccount: { id: 'from-acct' },
        toCashAccount: { id: 'to-acct' },
        amount: 5000,
      };
      mockRepo.findOne.mockResolvedValue(r);
      mockRepo.save.mockResolvedValue({
        ...r,
        status: PettyCashReplenishmentStatus.APPROVED,
        approvedBy: mockAdmin,
      });

      const result = await service.approve('r-1', {}, mockAdmin);
      expect(result.status).toBe(PettyCashReplenishmentStatus.APPROVED);
      expect(mockJournalEntryRepo.save).toHaveBeenCalled();
    });

    it('skips journal entry creation if already exists (idempotent)', async () => {
      const r = {
        id: 'r-1',
        status: PettyCashReplenishmentStatus.PENDING,
        requestedBy: { id: 'admin-2' },
        fromAccount: { id: 'from-acct' },
        toCashAccount: { id: 'to-acct' },
        amount: 5000,
        notes: null,
      };
      mockRepo.findOne.mockResolvedValue(r);
      mockRepo.save.mockResolvedValue({
        ...r,
        status: PettyCashReplenishmentStatus.APPROVED,
      });
      mockJournalEntryRepo.findOne.mockResolvedValue({ id: 'existing-je' });

      await service.approve('r-1', {}, mockAdmin);
      expect(mockJournalEntryRepo.save).not.toHaveBeenCalled();
    });

    it('prevents self-approval', async () => {
      const r = {
        id: 'r-1',
        status: PettyCashReplenishmentStatus.PENDING,
        requestedBy: { id: 'admin-1' },
      };
      mockRepo.findOne.mockResolvedValue(r);
      await expect(service.approve('r-1', {}, mockAdmin)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when not pending', async () => {
      const r = {
        id: 'r-1',
        status: PettyCashReplenishmentStatus.APPROVED,
        requestedBy: { id: 'admin-2' },
      };
      mockRepo.findOne.mockResolvedValue(r);
      await expect(service.approve('r-1', {}, mockAdmin)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws before saving when no open period and no existing journal entry', async () => {
      const r = {
        id: 'r-1',
        status: PettyCashReplenishmentStatus.PENDING,
        requestedBy: { id: 'admin-2' },
        fromAccount: { id: 'from-acct' },
        toCashAccount: { id: 'to-acct' },
        amount: 5000,
        notes: null,
      };
      mockRepo.findOne.mockResolvedValue(r);
      mockJournalEntryRepo.findOne.mockResolvedValue(null);
      mockPeriodRepo.findOne.mockResolvedValue(null);

      await expect(service.approve('r-1', {}, mockAdmin)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.approve('missing', {}, mockAdmin)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
