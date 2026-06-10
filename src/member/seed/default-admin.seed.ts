import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Member } from '../entity/member.entity';
import { MemberRoleEnum } from '../enums/member-role.enum';
import { MemberStatusEnum } from '../enums/member-status.enum';
import { UtilityService } from '../../utility/service/utility.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DefaultAdminSeed implements OnApplicationBootstrap {
  private readonly logger = new Logger(DefaultAdminSeed.name);

  constructor(
    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const adminEmail = this.configService.get<string>('DEFAULT_ADMIN_EMAIL');
    const adminPassword = this.configService.get<string>('DEFAULT_ADMIN_PASSWORD');

    if (!adminEmail || !adminPassword) {
      this.logger.warn('DEFAULT_ADMIN_EMAIL or DEFAULT_ADMIN_PASSWORD not set — skipping seed');
      return;
    }

    const exists = await this.memberRepository.exists({ where: { email: adminEmail } });
    if (exists) {
      this.logger.log('Default admin already exists — skipping seed');
      return;
    }

    const password = await UtilityService.hashValue(adminPassword);
    await this.memberRepository.save(
      this.memberRepository.create({
        firstname: 'Admin',
        lastname: 'User',
        email: adminEmail,
        password,
        role: MemberRoleEnum.ADMIN,
        status: MemberStatusEnum.ACTIVE,
      }),
    );

    this.logger.log(`Default admin seeded: ${adminEmail}`);
  }
}
