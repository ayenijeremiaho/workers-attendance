import {Test, TestingModule} from '@nestjs/testing';
import {getRepositoryToken} from '@nestjs/typeorm';
import {NotImplementedException} from '@nestjs/common';
import {VirtualAccountService} from './virtual-account.service';
import {MemberVirtualAccount} from '../entity/member-virtual-account.entity';
import {TitheRecord} from '../../tithe/entity/tithe-record.entity';
import {Member} from '../../member/entity/member.entity';
import {AuditLogService} from '../../utility/service/audit-log.service';
import {VirtualAccountProvider} from '../enum/finance.enum';

const mockVaRepo = {create: jest.fn(), save: jest.fn(), findOne: jest.fn(), find: jest.fn()};
const mockTitheRecordRepo = {create: jest.fn(), save: jest.fn(), findOne: jest.fn()};
const mockMemberRepo = {findOne: jest.fn()};
const mockAuditLogService = {log: jest.fn()};

describe('VirtualAccountService', () => {
    let service: VirtualAccountService;

    beforeEach(async () => {
        jest.clearAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                VirtualAccountService,
                {provide: getRepositoryToken(MemberVirtualAccount), useValue: mockVaRepo},
                {provide: getRepositoryToken(TitheRecord), useValue: mockTitheRecordRepo},
                {provide: getRepositoryToken(Member), useValue: mockMemberRepo},
                {provide: AuditLogService, useValue: mockAuditLogService},
            ],
        }).compile();
        service = module.get<VirtualAccountService>(VirtualAccountService);
    });

    it('requestAccount throws NotImplementedException', async () => {
        await expect(service.requestAccount('member-1', {provider: VirtualAccountProvider.PAYSTACK})).rejects.toThrow(NotImplementedException);
    });

    it('getMyAccounts throws NotImplementedException', async () => {
        await expect(service.getMyAccounts('member-1')).rejects.toThrow(NotImplementedException);
    });

    it('deactivate throws NotImplementedException', async () => {
        await expect(service.deactivate('va-1', {id: 'admin-1'} as any)).rejects.toThrow(NotImplementedException);
    });

    it('handleWebhookCredit throws NotImplementedException', async () => {
        await expect(service.handleWebhookCredit(Buffer.from('{}'), 'sig')).rejects.toThrow(NotImplementedException);
    });
});
