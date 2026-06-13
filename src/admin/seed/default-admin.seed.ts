import {Injectable, Logger, OnApplicationBootstrap} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {ConfigService} from '@nestjs/config';
import {Admin} from '../entity/admin.entity';
import {AdminRoleService} from '../service/admin-role.service';
import {Member} from '../../member/entity/member.entity';
import {MemberRoleEnum} from '../../member/enums/member-role.enum';
import {MemberStatusEnum} from '../../member/enums/member-status.enum';
import {UtilityService} from '../../utility/service/utility.service';

@Injectable()
export class DefaultAdminSeed implements OnApplicationBootstrap {
    private readonly logger = new Logger(DefaultAdminSeed.name);

    constructor(
        @InjectRepository(Member)
        private readonly memberRepository: Repository<Member>,
        @InjectRepository(Admin)
        private readonly adminRepository: Repository<Admin>,
        private readonly adminRoleService: AdminRoleService,
        private readonly configService: ConfigService,
    ) {
    }

    async onApplicationBootstrap(): Promise<void> {
        const adminEmail = this.configService.get<string>('DEFAULT_ADMIN_EMAIL');
        const adminPassword = this.configService.get<string>('DEFAULT_ADMIN_PASSWORD');

        if (!adminEmail || !adminPassword) {
            this.logger.warn('DEFAULT_ADMIN_EMAIL or DEFAULT_ADMIN_PASSWORD not set — skipping admin seed');
            return;
        }

        const memberExists = await this.memberRepository.existsBy({email: adminEmail});
        if (memberExists) {
            const member = await this.memberRepository.findOneBy({email: adminEmail});
            const adminExists = await this.adminRepository.existsBy({member: {id: member.id}});
            if (adminExists) {
                this.logger.log('Default admin already seeded — skipping');
                return;
            }
        }

        const superAdminRole = await this.adminRoleService.findOrCreateSuperAdmin();

        let member = await this.memberRepository.findOneBy({email: adminEmail});
        if (!member) {
            const password = await UtilityService.hashValue(adminPassword);
            member = await this.memberRepository.save(
                this.memberRepository.create({
                    firstname: 'Admin',
                    lastname: 'User',
                    email: adminEmail,
                    password,
                    role: MemberRoleEnum.MEMBER,
                    status: MemberStatusEnum.ACTIVE,
                    changedPassword: false,
                }),
            );
            this.logger.log(`Default admin member created: ${adminEmail}`);
        }

        await this.adminRepository.save(
            this.adminRepository.create({member, adminRole: superAdminRole, isActive: true}),
        );

        this.logger.log(`Default admin seeded with SuperAdmin role: ${adminEmail}`);
    }
}
