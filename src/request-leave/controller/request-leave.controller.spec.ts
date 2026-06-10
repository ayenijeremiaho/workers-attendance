import { Test, TestingModule } from '@nestjs/testing';
import { RequestLeaveController } from './request-leave.controller';
import { RequestLeaveService } from '../service/request-leave.service';

describe('RequestLeaveController', () => {
  let controller: RequestLeaveController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RequestLeaveController],
      providers: [{ provide: RequestLeaveService, useValue: {} }],
    }).compile();

    controller = module.get<RequestLeaveController>(RequestLeaveController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
