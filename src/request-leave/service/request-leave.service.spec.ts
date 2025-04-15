import { Test, TestingModule } from '@nestjs/testing';
import { RequestLeaveService } from './request-leave.service';

describe('RequestLeaveService', () => {
  let service: RequestLeaveService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RequestLeaveService],
    }).compile();

    service = module.get<RequestLeaveService>(RequestLeaveService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
