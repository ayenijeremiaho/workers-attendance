import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Department } from './entity/department.entity';
import { DepartmentLead } from './entity/department-lead.entity';
import { DepartmentService } from './service/department.service';
import { DepartmentController } from './controller/department.controller';
import { WorkerProfile } from '../member/entity/worker-profile.entity';
import { UtilityModule } from '../utility/utility.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Department, DepartmentLead, WorkerProfile]),
    UtilityModule,
  ],
  controllers: [DepartmentController],
  providers: [DepartmentService],
  exports: [TypeOrmModule, DepartmentService],
})
export class DepartmentModule {}
