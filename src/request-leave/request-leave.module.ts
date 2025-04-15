import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RequestLeave } from './enitity/request-leave.entity';
import { RequestLeaveService } from './service/request-leave.service';
import { UserModule } from '../user/user.module';
import { WorkerService } from '../user/service/worker.service';
import { AdminService } from '../user/service/admin.service';
import { RequestLeaveController } from './controller/request-leave.controller';
import { DepartmentModule } from '../department/department.module';
import { DepartmentService } from '../department/service/department.service';
import { UtilityModule } from '../utility/utility.module';
import { UtilityService } from '../utility/service/utility.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([RequestLeave]),
    UserModule,
    DepartmentModule,
    UtilityModule,
    RequestLeaveModule,
  ],
  controllers: [RequestLeaveController],
  providers: [
    RequestLeaveService,
    WorkerService,
    AdminService,
    DepartmentService,
    UtilityService,
    RequestLeaveService,
  ],
  exports: [TypeOrmModule, RequestLeaveService],
})
export class RequestLeaveModule {}
