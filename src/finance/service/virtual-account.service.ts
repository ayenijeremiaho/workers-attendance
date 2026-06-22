/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, NotImplementedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MemberVirtualAccount } from '../entity/member-virtual-account.entity';
import { TitheRecord } from '../../tithe/entity/tithe-record.entity';
import { Member } from '../../member/entity/member.entity';
import { Admin } from '../../admin/entity/admin.entity';
import { AuditLogService } from '../../utility/service/audit-log.service';
import { RequestVirtualAccountDto } from '../dto/virtual-account.dto';

// TODO: Virtual account integration — provider API calls not yet implemented
@Injectable()
export class VirtualAccountService {
  constructor(
    @InjectRepository(MemberVirtualAccount)
    private readonly virtualAccountRepo: Repository<MemberVirtualAccount>,
    @InjectRepository(TitheRecord)
    private readonly titheRecordRepo: Repository<TitheRecord>,
    @InjectRepository(Member)
    private readonly memberRepo: Repository<Member>,
    private readonly auditLogService: AuditLogService,
  ) {}

  async requestAccount(
    _memberId: string,
    _dto: RequestVirtualAccountDto,
  ): Promise<MemberVirtualAccount> {
    throw new NotImplementedException(
      'Virtual account creation is not yet implemented.',
    );
  }

  async getMyAccounts(_memberId: string): Promise<MemberVirtualAccount[]> {
    throw new NotImplementedException(
      'Virtual account listing is not yet implemented.',
    );
  }

  async deactivate(
    _accountId: string,
    _admin: Admin,
  ): Promise<MemberVirtualAccount> {
    throw new NotImplementedException(
      'Virtual account deactivation is not yet implemented.',
    );
  }

  async handleWebhookCredit(
    _rawBody: Buffer,
    _signature: string,
  ): Promise<void> {
    throw new NotImplementedException(
      'Virtual account webhook handling is not yet implemented.',
    );
  }
}
