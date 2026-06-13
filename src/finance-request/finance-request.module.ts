import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {FinanceCategory} from './entity/finance-category.entity';
import {FinanceRequest} from './entity/finance-request.entity';
import {FinanceRequestService} from './service/finance-request.service';
import {FinanceAdminController} from './controller/finance-admin.controller';
import {FinanceWorkerController} from './controller/finance-worker.controller';
import {AdminModule} from '../admin/admin.module';
import {DepartmentModule} from '../department/department.module';
import {UtilityModule} from '../utility/utility.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([FinanceCategory, FinanceRequest]),
        AdminModule,
        DepartmentModule,
        UtilityModule,
    ],
    controllers: [FinanceAdminController, FinanceWorkerController],
    providers: [FinanceRequestService],
})
export class FinanceRequestModule {}
