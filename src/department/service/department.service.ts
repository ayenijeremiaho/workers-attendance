import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from '../entity/department.entity';
import { CreateDepartmentDto } from '../dto/create-department.dto';
import { UpdateDepartmentDto } from '../dto/update-department.dto';
import { PaginationResponseDto } from '../../utility/dto/pagination-response.dto';
import { UtilityService } from '../../utility/service/utility.service';
import { Worker } from '../../user/entity/worker.entity';
import { AssignDepartmentHodDto } from '../dto/assign-department-hod.dto';
import { RemoveDepartmentHodDto } from '../dto/remove-department-hod.dto';
import { DepartmentLead } from '../entity/department-lead.entity';
import { DepartmentLeadTypeEnum } from '../enums/department-lead-type.enum';

@Injectable()
export class DepartmentService {
  private readonly logger: Logger = new Logger(DepartmentService.name);

  constructor(
    @InjectRepository(Worker)
    private readonly workerRepository: Repository<Worker>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(DepartmentLead)
    private readonly departmentLeadRepository: Repository<DepartmentLead>,
  ) {}

  async create(createDepartmentDto: CreateDepartmentDto): Promise<Department> {
    await this.validateDepartmentIsValid(createDepartmentDto.name);

    const department = { ...createDepartmentDto };
    return this.departmentRepository.save(department);
  }

  async getOne(id: string): Promise<Department> {
    return await this.getDepartment(id);
  }

  async getAll(
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginationResponseDto<Department>> {
    if (page < 1) {
      throw new BadRequestException('Page number must be greater than 0');
    }

    const [departments, total] = await this.departmentRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return UtilityService.createPaginationResponse<Department>(
      departments,
      page,
      limit,
      total,
    );
  }

  async update(
    id: string,
    updateDepartmentDto: UpdateDepartmentDto,
  ): Promise<Department> {
    const department = await this.getDepartment(id);

    let changesMade = false;
    if (
      updateDepartmentDto.name &&
      updateDepartmentDto.name != department.name
    ) {
      await this.validateDepartmentIsValid(updateDepartmentDto.name);
      department.name = updateDepartmentDto.name;
      changesMade = true;
    }

    if (updateDepartmentDto.description) {
      department.description = updateDepartmentDto.description;
      changesMade = true;
    }

    if (changesMade) {
      return this.departmentRepository.save(department);
    }
    return department;
  }

  async delete(id: string): Promise<void> {
    const department = await this.getDepartment(id);

    const isAttachedToWorker = await this.isAttachedToWorker(id);

    if (isAttachedToWorker) {
      this.logger.error(
        `${department.name} department is attached to a worker`,
      );
      throw new BadRequestException(
        `${department.name} department is attached to a worker, cannot be deleted`,
      );
    }

    await this.departmentRepository.delete(id);
  }

  async assignHod(assignHodDto: AssignDepartmentHodDto): Promise<Department> {
    const { departmentId, workerId, type } = assignHodDto;

    const department = await this.getDepartment(departmentId);

    const workerExist = await this.workerRepository.findOne({
      where: { id: workerId, department: { id: departmentId } },
    });

    if (!workerExist) {
      this.logger.error('Worker not found in the department');
      throw new NotFoundException('Worker not found in the department');
    }

    const leads = await this.departmentLeadRepository.find({
      where: { department: { id: departmentId } },
      relations: ['lead'],
    });

    if (type === 'head') {
      const currentHod = leads.find(
        (lead) => lead.leadType === DepartmentLeadTypeEnum.HOD,
      );

      if (currentHod?.lead.id === workerId) {
        this.logger.error('Worker is already the head of the department');
        throw new BadRequestException(
          'Worker is already the head of the department',
        );
      }

      if (currentHod) {
        await this.departmentLeadRepository.remove(currentHod);
      }

      const newHod = this.departmentLeadRepository.create({
        lead: workerExist,
        department,
        leadType: DepartmentLeadTypeEnum.HOD,
      });

      await this.departmentLeadRepository.save(newHod);
    } else if (type === 'assistant') {
      const currentAsstHod = leads.find(
        (lead) => lead.leadType === DepartmentLeadTypeEnum.D_HOD,
      );

      if (currentAsstHod?.lead.id === workerId) {
        this.logger.error(
          'Worker is already the assistant head of the department',
        );
        throw new BadRequestException(
          'Worker is already the assistant head of the department',
        );
      }

      if (currentAsstHod) {
        await this.departmentLeadRepository.remove(currentAsstHod);
      }

      const newAsstHod = this.departmentLeadRepository.create({
        lead: workerExist,
        department,
        leadType: DepartmentLeadTypeEnum.D_HOD,
      });

      await this.departmentLeadRepository.save(newAsstHod);
    } else {
      this.logger.error('Invalid request type provided', type);
      throw new BadRequestException('Invalid request type provided');
    }

    return department;
  }

  async removeHod(removeHodDto: RemoveDepartmentHodDto): Promise<Department> {
    const { departmentId, type } = removeHodDto;

    const department = await this.getDepartment(departmentId);

    const leads = await this.departmentLeadRepository.find({
      where: { department: { id: departmentId } },
      relations: ['lead'],
    });

    if (type === 'head') {
      const currentHod = leads.find(
        (lead) => lead.leadType === DepartmentLeadTypeEnum.HOD,
      );

      if (!currentHod) {
        this.logger.error('Department does not have a head');
        throw new BadRequestException('Department does not have a head');
      }

      await this.departmentLeadRepository.remove(currentHod);
    } else if (type === 'assistant') {
      const currentAsstHod = leads.find(
        (lead) => lead.leadType === DepartmentLeadTypeEnum.D_HOD,
      );

      if (!currentAsstHod) {
        this.logger.error('Department does not have an assistant head');
        throw new BadRequestException(
          'Department does not have an assistant head',
        );
      }

      await this.departmentLeadRepository.remove(currentAsstHod);
    } else {
      this.logger.error('Invalid request type provided', type);
      throw new BadRequestException('Invalid request type provided');
    }

    return department;
  }

  async getDepartmentHods(
    departmentId: string,
  ): Promise<{ name: string; head: Worker | null; assistant: Worker | null }> {
    const department = await this.getDepartment(departmentId);

    const leads = await this.departmentLeadRepository.find({
      where: { department: { id: departmentId } },
      relations: ['lead'],
    });

    const head =
      leads.find((lead) => lead.leadType === DepartmentLeadTypeEnum.HOD)
        ?.lead || null;

    const assistant =
      leads.find((lead) => lead.leadType === DepartmentLeadTypeEnum.D_HOD)
        ?.lead || null;

    return {
      name: department.name,
      head,
      assistant,
    };
  }

  async getAllHods(): Promise<DepartmentLead[]> {
    return this.departmentLeadRepository.find({
      relations: ['lead', 'department'],
    });
  }

  async isWorkerDepartmentLead(workerId: string): Promise<boolean> {
    const lead = await this.departmentLeadRepository.findOne({
      where: { lead: { id: workerId } },
    });
    return !!lead;
  }

  private async getDepartment(id: string) {
    const department = await this.departmentRepository.findOne({
      where: { id },
    });

    if (!department) {
      this.logger.error('Department not found');
      throw new NotFoundException('Department not found');
    }
    return department;
  }

  private isAttachedToWorker(departmentId: string): Promise<boolean> {
    this.logger.log('Checking if department is attached to a worker');

    return this.departmentRepository
      .createQueryBuilder('worker')
      .where('worker.department = :departmentId', { departmentId })
      .limit(1)
      .getExists();
  }

  private async validateDepartmentIsValid(name: string): Promise<void> {
    const isExist = await this.departmentRepository.existsBy({ name: name });

    if (isExist) {
      this.logger.error('Department with the provided name already exist');
      throw new BadRequestException(
        'Department with the provided name already exist',
      );
    }
  }
}
