import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DepartmentService } from './department.service';
import { Department } from '../entity/department.entity';
import { DepartmentLead } from '../entity/department-lead.entity';
import { WorkerProfile } from '../../member/entity/worker-profile.entity';

describe('DepartmentService', () => {
  let service: DepartmentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepartmentService,
        { provide: getRepositoryToken(Department), useValue: { save: jest.fn(), find: jest.fn(), findOne: jest.fn(), exists: jest.fn() } },
        { provide: getRepositoryToken(DepartmentLead), useValue: { save: jest.fn(), find: jest.fn(), findOne: jest.fn() } },
        { provide: getRepositoryToken(WorkerProfile), useValue: { findOne: jest.fn() } },
      ],
    }).compile();

    service = module.get<DepartmentService>(DepartmentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
