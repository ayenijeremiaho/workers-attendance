import {Test, TestingModule} from '@nestjs/testing';
import {getRepositoryToken, getDataSourceToken} from '@nestjs/typeorm';
import {NotFoundException} from '@nestjs/common';
import {OfferingService} from './offering.service';
import {Offering} from '../entity/offering.entity';
import {JournalEntry} from '../entity/journal-entry.entity';
import {JournalEntryLine} from '../entity/journal-entry-line.entity';
import {Account} from '../entity/account.entity';
import {AccountingPeriod} from '../entity/accounting-period.entity';
import {OfferingType} from '../enum/finance.enum';
import {AuditLogService} from '../../utility/service/audit-log.service';

const mockAdmin = {id: 'admin-1'} as any;

const mockOfferingRepo = {
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

describe('OfferingService', () => {
    let service: OfferingService;

    beforeEach(async () => {
        jest.clearAllMocks();
        mockOfferingRepo.createQueryBuilder.mockReturnValue(mockQb);
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OfferingService,
                {provide: getRepositoryToken(Offering), useValue: mockOfferingRepo},
                {provide: getRepositoryToken(JournalEntry), useValue: {create: jest.fn(), save: jest.fn()}},
                {provide: getRepositoryToken(JournalEntryLine), useValue: {create: jest.fn(), save: jest.fn()}},
                {provide: getRepositoryToken(Account), useValue: {findOne: jest.fn(), save: jest.fn()}},
                {provide: getRepositoryToken(AccountingPeriod), useValue: {findOne: jest.fn()}},
                {provide: AuditLogService, useValue: mockAuditLogService},
                {provide: getDataSourceToken(), useValue: {transaction: jest.fn()}},
            ],
        }).compile();
        service = module.get<OfferingService>(OfferingService);
    });

    describe('create', () => {
        it('records a new offering', async () => {
            const offering = {id: 'o-1', type: OfferingType.GENERAL, cashAmount: 5000};
            mockOfferingRepo.create.mockReturnValue(offering);
            mockOfferingRepo.save.mockResolvedValue(offering);

            const result = await service.create({fundId: 'f-1', type: OfferingType.GENERAL, cashAmount: 5000}, mockAdmin);
            expect(result.id).toBe('o-1');
            expect(mockAuditLogService.log).toHaveBeenCalledWith('OFFERING_RECORDED', expect.any(Object));
        });
    });

    describe('reconcile', () => {
        it('marks offering as reconciled', async () => {
            const offering = {id: 'o-1', isReconciled: false, reconciledAt: null, notes: null};
            mockOfferingRepo.findOne.mockResolvedValue(offering);
            mockOfferingRepo.save.mockResolvedValue({...offering, isReconciled: true});

            const result = await service.reconcile('o-1', {notes: 'Verified'}, mockAdmin);
            expect(result.isReconciled).toBe(true);
        });

        it('throws NotFoundException when offering missing', async () => {
            mockOfferingRepo.findOne.mockResolvedValue(null);
            await expect(service.reconcile('missing', {notes: 'x'}, mockAdmin)).rejects.toThrow(NotFoundException);
        });
    });
});
