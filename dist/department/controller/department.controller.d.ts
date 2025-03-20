import { DepartmentService } from '../service/department.service';
import { Department } from '../entity/department.entity';
import { PaginationResponseDto } from '../../utility/dto/PaginationResponseDto';
import { CreateDepartmentDto } from '../dto/create-department.dto';
import { UpdateDepartmentDto } from '../dto/update-department.dto';
export declare class DepartmentController {
    private readonly departmentService;
    constructor(departmentService: DepartmentService);
    findAll(page?: number, limit?: number): Promise<PaginationResponseDto<Department>>;
    findOne(id: string): Promise<Department>;
    create(request: CreateDepartmentDto): Promise<Department>;
    update(id: string, request: UpdateDepartmentDto): Promise<Department>;
    delete(id: string): Promise<void>;
}
