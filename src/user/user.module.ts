import { Module } from '@nestjs/common';
import { AdminController } from './controller/admin.controller';
import { AdminService } from './service/admin.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from './entity/admin.entity';
import { UtilityService } from '../utility/utility.service';
import { WorkerController } from './controller/worker.controller';
import { Worker } from './entity/worker.entity';
import { WorkerService } from './service/worker.service';
import { Department } from '../department/entity/department.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Admin, Worker, Department])],
  controllers: [AdminController, WorkerController],
  providers: [AdminService, WorkerService, UtilityService],
})
export class UserModule {}
