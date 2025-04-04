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

@Injectable()
export class DepartmentService {
  private readonly logger: Logger = new Logger(DepartmentService.name);

  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
  ) {}

  async create(createDepartmentDto: CreateDepartmentDto): Promise<Department> {
    await this.validateDepartmentIsValid(createDepartmentDto.name);

    const department = { ...createDepartmentDto };
    return this.departmentRepository.save(department);
  }

  async getOne(id: string): Promise<Department> {
    const department = await this.departmentRepository.findOneBy({
      id: id,
    });

    if (!department) {
      this.logger.error('Department not found');
      throw new NotFoundException('Department not found');
    }

    return department;
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
    const department = await this.departmentRepository.findOne({
      where: { id },
    });

    if (!department) {
      this.logger.error('Department not found');
      throw new NotFoundException('Department not found');
    }

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
    const department = await this.departmentRepository.findOne({
      where: { id },
    });

    if (!department) {
      this.logger.error('Department not found');
      throw new NotFoundException('Department not found');
    }

    const isAttachedToWorker = await this.isAttachedToWorker(id);

    if (isAttachedToWorker) {
      this.logger.error('Department is attached to a worker');
      throw new BadRequestException(
        'Department is attached to a worker, cannot be deleted',
      );
    }

    await this.departmentRepository.delete(id);
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
