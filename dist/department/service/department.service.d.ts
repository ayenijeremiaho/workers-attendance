import { Repository } from 'typeorm';
import { Department } from '../entity/department.entity';
import { CreateDepartmentDto } from '../dto/create-department.dto';
import { UpdateDepartmentDto } from '../dto/update-department.dto';
import { PaginationResponseDto } from '../../utility/dto/PaginationResponseDto';
export declare class DepartmentService {
    private readonly departmentRepository;
    private readonly logger;
    constructor(departmentRepository: Repository<Department>);
    create(createDepartmentDto: CreateDepartmentDto): Promise<Department>;
    getOne(id: string): Promise<Department>;
    getAll(page?: number, limit?: number): Promise<PaginationResponseDto<Department>>;
    update(id: string, updateDepartmentDto: UpdateDepartmentDto): Promise<Department>;
    delete(id: string): Promise<void>;
    private isAttachedToWorker;
    private validateDepartmentIsValid;
}
