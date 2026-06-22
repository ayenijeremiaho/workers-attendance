import {Test, TestingModule} from '@nestjs/testing';
import {getRepositoryToken} from '@nestjs/typeorm';
import {ConflictException, NotFoundException} from '@nestjs/common';
import {AccountingPeriodService} from './accounting-period.service';
import {AccountingPeriod} from '../entity/accounting-period.entity';
import {AccountingPeriodStatus} from '../enum/finance.enum';
import {AuditLogService} from '../../utility/service/audit-log.service';

const mockAdmin = {id: 'admin-1'} as any;

const mockPeriodRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
};

const mockAuditLogService = {log: jest.fn()};

describe('AccountingPeriodService', () => {
    let service: AccountingPeriodService;

    beforeEach(async () => {
        jest.clearAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AccountingPeriodService,
                {provide: getRepositoryToken(AccountingPeriod), useValue: mockPeriodRepo},
                {provide: AuditLogService, useValue: mockAuditLogService},
            ],
        }).compile();
        service = module.get<AccountingPeriodService>(AccountingPeriodService);
    });

    describe('create', () => {
        it('creates a new accounting period', async () => {
            mockPeriodRepo.findOne.mockResolvedValue(null);
            const period = {id: 'p-1', year: 2026, month: 1, status: AccountingPeriodStatus.OPEN};
            mockPeriodRepo.create.mockReturnValue(period);
            mockPeriodRepo.save.mockResolvedValue(period);

            const result = await service.create({year: 2026, month: 1}, mockAdmin);
            expect(result.year).toBe(2026);
        });

        it('throws ConflictException for duplicate period', async () => {
            mockPeriodRepo.findOne.mockResolvedValue({id: 'p-1'});
            await expect(service.create({year: 2026, month: 1}, mockAdmin)).rejects.toThrow(ConflictException);
        });
    });

    describe('close', () => {
        it('closes an open period', async () => {
            const period = {id: 'p-1', year: 2026, month: 1, status: AccountingPeriodStatus.OPEN, closedAt: null, closedBy: null};
            mockPeriodRepo.findOne.mockResolvedValue(period);
            mockPeriodRepo.save.mockResolvedValue({...period, status: AccountingPeriodStatus.CLOSED, closedAt: new Date()});

            const result = await service.close('p-1', mockAdmin);
            expect(result.status).toBe(AccountingPeriodStatus.CLOSED);
        });

        it('throws ConflictException when already closed', async () => {
            const period = {id: 'p-1', status: AccountingPeriodStatus.CLOSED};
            mockPeriodRepo.findOne.mockResolvedValue(period);
            await expect(service.close('p-1', mockAdmin)).rejects.toThrow(ConflictException);
        });
    });

    describe('reopen', () => {
        it('throws ConflictException when already open', async () => {
            const period = {id: 'p-1', status: AccountingPeriodStatus.OPEN};
            mockPeriodRepo.findOne.mockResolvedValue(period);
            await expect(service.reopen('p-1', mockAdmin)).rejects.toThrow(ConflictException);
        });

        it('throws NotFoundException when period missing', async () => {
            mockPeriodRepo.findOne.mockResolvedValue(null);
            await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
        });
    });
});
