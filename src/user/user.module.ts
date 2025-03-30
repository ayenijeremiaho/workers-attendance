import { Module, OnModuleInit } from '@nestjs/common';
import { AdminController } from './controller/admin.controller';
import { AdminService } from './service/admin.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from './entity/admin.entity';
import { UtilityService } from '../utility/utility.service';
import { WorkerController } from './controller/worker.controller';
import { Worker } from './entity/worker.entity';
import { WorkerService } from './service/worker.service';
import { Department } from '../department/entity/department.entity';
import { DefaultAdminSeed } from './seed/default-admin.seed';

@Module({
  imports: [TypeOrmModule.forFeature([Admin, Worker, Department])],
  providers: [AdminService, WorkerService, DefaultAdminSeed, UtilityService],
  controllers: [AdminController, WorkerController],
})
export class UserModule implements OnModuleInit {
  constructor(private readonly defaultAdminSeed: DefaultAdminSeed) {}

  async onModuleInit() {
    await this.defaultAdminSeed.seed();
  }
}
