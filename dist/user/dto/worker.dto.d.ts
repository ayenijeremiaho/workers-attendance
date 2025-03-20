import { UserDto } from './user.dto';
import { DepartmentDto } from '../../department/dto/department.dto';
export declare class WorkerDto extends UserDto {
    department: DepartmentDto;
}
