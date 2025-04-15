import { Module } from '@nestjs/common';
import { DepartmentController } from './controller/department.controller';
import { DepartmentService } from './service/department.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Worker } from '../user/entity/worker.entity';
import { Department } from './entity/department.entity';
import { DepartmentLead } from './entity/department-lead.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Department, DepartmentLead, Worker])],
  controllers: [DepartmentController],
  providers: [DepartmentService],
  exports: [TypeOrmModule, DepartmentService],
})
export class DepartmentModule {}
