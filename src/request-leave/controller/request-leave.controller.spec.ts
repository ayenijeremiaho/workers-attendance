import { Test, TestingModule } from '@nestjs/testing';
import { RequestLeaveController } from './request-leave.controller';

describe('RequestLeaveController', () => {
  let controller: RequestLeaveController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RequestLeaveController],
    }).compile();

    controller = module.get<RequestLeaveController>(RequestLeaveController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
