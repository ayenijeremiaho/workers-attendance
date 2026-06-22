import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RequestLeave } from './enitity/request-leave.entity';
import { RequestLeaveService } from './service/request-leave.service';
import { RequestLeaveController } from './controller/request-leave.controller';
import { MemberModule } from '../member/member.module';
import { DepartmentModule } from '../department/department.module';
import { UtilityModule } from '../utility/utility.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RequestLeave]),
    MemberModule,
    DepartmentModule,
    UtilityModule,
  ],
  controllers: [RequestLeaveController],
  providers: [RequestLeaveService],
  exports: [TypeOrmModule, RequestLeaveService],
})
export class RequestLeaveModule {}
