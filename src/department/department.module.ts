import { Module } from '@nestjs/common';
import { DepartmentController } from './controller/department.controller';
import { DepartmentService } from './service/department.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Worker } from '../user/entity/worker.entity';
import { Department } from './entity/department.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Department, Worker])],
  controllers: [DepartmentController],
  providers: [DepartmentService],
})
export class DepartmentModule {}
