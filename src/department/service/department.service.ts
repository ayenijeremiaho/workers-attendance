import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from '../entity/department.entity';
import { DepartmentLead } from '../entity/department-lead.entity';
import { DepartmentLeadTypeEnum } from '../enums/department-lead-type.enum';
import { WorkerProfile } from '../../member/entity/worker-profile.entity';
import { CreateDepartmentDto } from '../dto/create-department.dto';
import { UpdateDepartmentDto } from '../dto/update-department.dto';
import { AssignDepartmentHodDto } from '../dto/assign-department-hod.dto';
import { RemoveDepartmentHodDto } from '../dto/remove-department-hod.dto';
import { PaginationResponseDto } from '../../utility/dto/pagination-response.dto';
import { UtilityService } from '../../utility/service/utility.service';

@Injectable()
export class DepartmentService {
  private readonly logger = new Logger(DepartmentService.name);

  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(DepartmentLead)
    private readonly leadRepository: Repository<DepartmentLead>,
    @InjectRepository(WorkerProfile)
    private readonly workerProfileRepository: Repository<WorkerProfile>,
  ) {}

  async create(dto: CreateDepartmentDto): Promise<Department> {
    await this.assertNameUnique(dto.name);
    return this.departmentRepository.save({ ...dto });
  }

  async getOne(id: string): Promise<Department> {
    return this.getDepartmentOrThrow(id);
  }

  async getAll(page = 1, limit = 10): Promise<PaginationResponseDto<Department>> {
    if (page < 1) throw new BadRequestException('Page must be greater than 0');
    const [departments, total] = await this.departmentRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return UtilityService.createPaginationResponse(departments, page, limit, total);
  }

  async update(id: string, dto: UpdateDepartmentDto): Promise<Department> {
    const department = await this.getDepartmentOrThrow(id);

    if (dto.name && dto.name !== department.name) {
      await this.assertNameUnique(dto.name);
      department.name = dto.name;
    }
    if (dto.description) department.description = dto.description;

    return this.departmentRepository.save(department);
  }

  async delete(id: string): Promise<void> {
    const department = await this.getDepartmentOrThrow(id);

    const hasWorkers = await this.workerProfileRepository.exists({
      where: { department: { id } },
    });
    if (hasWorkers) {
      throw new BadRequestException(
        `${department.name} has workers assigned and cannot be deleted`,
      );
    }

    await this.departmentRepository.delete(id);
  }

  async assignLead(dto: AssignDepartmentHodDto): Promise<Department> {
    const { departmentId, workerId, type } = dto;

    const department = await this.getDepartmentOrThrow(departmentId);

    const profile = await this.workerProfileRepository.findOne({
      where: { id: workerId, department: { id: departmentId } },
    });
    if (!profile) throw new NotFoundException('Worker not found in this department');

    const leadType = type === 'head' ? DepartmentLeadTypeEnum.HOD : DepartmentLeadTypeEnum.D_HOD;

    const existing = await this.leadRepository.findOne({
      where: { department: { id: departmentId }, leadType },
      relations: ['workerProfile'],
    });

    if (existing?.workerProfile.id === workerId) {
      throw new BadRequestException('This worker is already assigned to that lead role');
    }

    if (existing) await this.leadRepository.remove(existing);

    await this.leadRepository.save(
      this.leadRepository.create({ workerProfile: profile, department, leadType }),
    );

    return department;
  }

  async removeLead(dto: RemoveDepartmentHodDto): Promise<Department> {
    const { departmentId, type } = dto;
    const department = await this.getDepartmentOrThrow(departmentId);

    const leadType = type === 'head' ? DepartmentLeadTypeEnum.HOD : DepartmentLeadTypeEnum.D_HOD;
    const lead = await this.leadRepository.findOne({
      where: { department: { id: departmentId }, leadType },
    });

    if (!lead) throw new BadRequestException(`No ${type} assigned to this department`);

    await this.leadRepository.remove(lead);
    return department;
  }

  async getDepartmentLeads(departmentId: string) {
    const department = await this.getDepartmentOrThrow(departmentId);

    const leads = await this.leadRepository.find({
      where: { department: { id: departmentId } },
      relations: ['workerProfile', 'workerProfile.member'],
    });

    const find = (t: DepartmentLeadTypeEnum) =>
      leads.find((l) => l.leadType === t)?.workerProfile ?? null;

    return {
      name: department.name,
      head: find(DepartmentLeadTypeEnum.HOD),
      assistant: find(DepartmentLeadTypeEnum.D_HOD),
    };
  }

  async getAllLeads(): Promise<DepartmentLead[]> {
    return this.leadRepository.find({
      relations: ['workerProfile', 'workerProfile.member', 'department'],
    });
  }

  async isMemberDepartmentLead(memberId: string): Promise<boolean> {
    return this.leadRepository.exists({
      where: { workerProfile: { member: { id: memberId } } },
    });
  }

  private async getDepartmentOrThrow(id: string): Promise<Department> {
    const dept = await this.departmentRepository.findOneBy({ id });
    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }

  private async assertNameUnique(name: string): Promise<void> {
    if (await this.departmentRepository.existsBy({ name })) {
      throw new BadRequestException('Department name already exists');
    }
  }
}
