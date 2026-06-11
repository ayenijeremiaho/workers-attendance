import { Test, TestingModule } from '@nestjs/testing';
import { DepartmentController } from './department.controller';
import { DepartmentService } from '../service/department.service';

const mockDepartmentService = {
  getAll: jest.fn(),
  getOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  assignLead: jest.fn(),
  removeLead: jest.fn(),
  getDepartmentLeads: jest.fn(),
  getAllLeads: jest.fn(),
  getWorkersByDepartment: jest.fn(),
  getDepartmentSummary: jest.fn(),
};

describe('DepartmentController', () => {
  let controller: DepartmentController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DepartmentController],
      providers: [{ provide: DepartmentService, useValue: mockDepartmentService }],
    }).compile();

    controller = module.get<DepartmentController>(DepartmentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAll', () => {
    it('should delegate to service with coerced numeric params', async () => {
      const paginated = { data: [], page: 1, limit: 10, totalCount: 0, totalPages: 0 };
      mockDepartmentService.getAll.mockResolvedValue(paginated);

      const result = await controller.getAll(2, 5);

      expect(mockDepartmentService.getAll).toHaveBeenCalledWith(2, 5);
      expect(result).toEqual(paginated);
    });
  });

  describe('getOne', () => {
    it('should delegate to service', async () => {
      const dept = { id: 'dept-1', name: 'Media' };
      mockDepartmentService.getOne.mockResolvedValue(dept);

      const result = await controller.getOne('dept-1');

      expect(mockDepartmentService.getOne).toHaveBeenCalledWith('dept-1');
      expect(result).toEqual(dept);
    });
  });

  describe('assignLead', () => {
    it('should delegate to service with the full DTO', async () => {
      const dto = { departmentId: 'dept-1', memberId: 'member-1', type: 'head' as const };
      const dept = { id: 'dept-1', name: 'Media' };
      mockDepartmentService.assignLead.mockResolvedValue(dept);

      const result = await controller.assignLead(dto);

      expect(mockDepartmentService.assignLead).toHaveBeenCalledWith(dto);
      expect(result).toEqual(dept);
    });
  });

  describe('removeLead', () => {
    it('should delegate to service', async () => {
      const dto = { departmentId: 'dept-1', type: 'head' as const };
      const dept = { id: 'dept-1', name: 'Media' };
      mockDepartmentService.removeLead.mockResolvedValue(dept);

      const result = await controller.removeLead(dto);

      expect(mockDepartmentService.removeLead).toHaveBeenCalledWith(dto);
      expect(result).toEqual(dept);
    });
  });

  describe('getWorkersByDepartment', () => {
    it('should delegate to service with coerced numeric params', async () => {
      const paginated = { data: [], page: 1, limit: 20, totalCount: 0, totalPages: 0 };
      mockDepartmentService.getWorkersByDepartment.mockResolvedValue(paginated);

      const result = await controller.getWorkersByDepartment('dept-1', 1, 20);

      expect(mockDepartmentService.getWorkersByDepartment).toHaveBeenCalledWith('dept-1', 1, 20);
      expect(result).toEqual(paginated);
    });
  });

  describe('getDepartmentSummary', () => {
    it('should delegate to service with the authenticated user id', async () => {
      const summary = {
        departmentId: 'dept-1',
        departmentName: 'Media',
        myLeadRole: 'head',
        totalWorkers: 10,
        activeWorkers: 8,
        inactiveWorkers: 2,
        attendancePercentage: 75,
        workersOnLeave: [],
      };
      mockDepartmentService.getDepartmentSummary.mockResolvedValue(summary);
      const req = { user: { id: 'member-1' } };

      const result = await controller.getDepartmentSummary(req);

      expect(mockDepartmentService.getDepartmentSummary).toHaveBeenCalledWith({ id: 'member-1' }, undefined);
      expect(result).toEqual(summary);
    });
  });
});
