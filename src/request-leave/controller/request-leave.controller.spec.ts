import { Test, TestingModule } from '@nestjs/testing';
import { RequestLeaveController } from './request-leave.controller';
import { RequestLeaveService } from '../service/request-leave.service';
import { AdminGuard } from '../../admin/guard/admin.guard';

describe('RequestLeaveController', () => {
  let controller: RequestLeaveController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RequestLeaveController],
      providers: [{ provide: RequestLeaveService, useValue: {} }],
    })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<RequestLeaveController>(RequestLeaveController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
