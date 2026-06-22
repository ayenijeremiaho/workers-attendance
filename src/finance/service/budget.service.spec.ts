import {Test, TestingModule} from '@nestjs/testing';
import {getRepositoryToken} from '@nestjs/typeorm';
import {NotFoundException} from '@nestjs/common';
import {BudgetService} from './budget.service';
import {Budget} from '../entity/budget.entity';
import {BudgetPeriod} from '../enum/finance.enum';
import {AuditLogService} from '../../utility/service/audit-log.service';

const mockAdmin = {id: 'admin-1'} as any;

const mockBudgetRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
};

const mockQb = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
};

const mockAuditLogService = {log: jest.fn()};

describe('BudgetService', () => {
    let service: BudgetService;

    beforeEach(async () => {
        jest.clearAllMocks();
        mockBudgetRepo.createQueryBuilder.mockReturnValue(mockQb);
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                BudgetService,
                {provide: getRepositoryToken(Budget), useValue: mockBudgetRepo},
                {provide: AuditLogService, useValue: mockAuditLogService},
            ],
        }).compile();
        service = module.get<BudgetService>(BudgetService);
    });

    describe('create', () => {
        it('creates a new budget', async () => {
            const budget = {id: 'b-1', name: 'Outreach 2026', period: BudgetPeriod.ANNUAL, amount: 100000};
            mockBudgetRepo.create.mockReturnValue(budget);
            mockBudgetRepo.save.mockResolvedValue(budget);

            const result = await service.create(
                {name: 'Outreach 2026', fundId: 'f-1', accountId: 'a-1', period: BudgetPeriod.ANNUAL, amount: 100000, startDate: '2026-01-01', endDate: '2026-12-31'},
                mockAdmin,
            );
            expect(result.id).toBe('b-1');
            expect(mockAuditLogService.log).toHaveBeenCalledWith('BUDGET_CREATED', expect.any(Object));
        });
    });

    describe('deactivate', () => {
        it('deactivates an active budget', async () => {
            const budget = {id: 'b-1', isActive: true, fund: {}, account: {normalBalance: 'DEBIT'}, createdBy: {}};
            mockBudgetRepo.findOne.mockResolvedValue(budget);
            mockBudgetRepo.save.mockResolvedValue({...budget, isActive: false});

            const result = await service.deactivate('b-1', mockAdmin);
            expect(result.isActive).toBe(false);
        });

        it('throws NotFoundException when budget missing', async () => {
            mockBudgetRepo.findOne.mockResolvedValue(null);
            await expect(service.deactivate('missing', mockAdmin)).rejects.toThrow(NotFoundException);
        });
    });
});
