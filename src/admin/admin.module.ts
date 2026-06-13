import {Global, Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {Admin} from './entity/admin.entity';
import {AdminRole} from './entity/admin-role.entity';
import {AdminService} from './service/admin.service';
import {AdminRoleService} from './service/admin-role.service';
import {AdminController} from './controller/admin.controller';
import {AdminRoleController} from './controller/admin-role.controller';
import {AdminGuard} from './guard/admin.guard';
import {DefaultAdminSeed} from './seed/default-admin.seed';
import {MemberModule} from '../member/member.module';
import {UtilityModule} from '../utility/utility.module';

@Global()
@Module({
    imports: [
        TypeOrmModule.forFeature([Admin, AdminRole]),
        MemberModule,
        UtilityModule,
    ],
    controllers: [AdminController, AdminRoleController],
    providers: [AdminService, AdminRoleService, AdminGuard, DefaultAdminSeed],
    exports: [AdminService, AdminRoleService, AdminGuard, TypeOrmModule],
})
export class AdminModule {
}
