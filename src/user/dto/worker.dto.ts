import { UserDto } from './user.dto';
import { DepartmentDto } from '../../department/dto/department.dto';
import { Exclude, Expose } from 'class-transformer';
import { WorkerStatusEnum } from '../enums/worker-status.enum';

@Exclude()
export class WorkerDto extends UserDto {
  @Expose()
  department: DepartmentDto;

  @Expose()
  status: WorkerStatusEnum;
}
