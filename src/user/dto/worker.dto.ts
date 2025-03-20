import { UserDto } from './user.dto';
import { DepartmentDto } from '../../department/dto/department.dto';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class WorkerDto extends UserDto {
  @Expose()
  department: DepartmentDto;
}
