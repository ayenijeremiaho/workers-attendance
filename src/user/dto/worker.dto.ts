import { UserDto } from './user.dto';
import { DepartmentDto } from '../../department/dto/department.dto';
import { Exclude, Expose } from 'class-transformer';
import { WorkerStatusEnum } from '../enums/worker-status.enum';
import { ToDateString } from '../../utility/dto/date-converter';
import { MaritalStatusEnum } from '../enums/marital-status.enum';
import { GenderEnum } from '../enums/gender.enum';

@Exclude()
export class WorkerDto extends UserDto {
  @Expose()
  department: DepartmentDto;

  @Expose()
  status: WorkerStatusEnum;

  @Expose()
  @ToDateString()
  yearBaptized: string;

  @Expose()
  @ToDateString()
  yearBornAgain: string;

  @Expose()
  profession: string;

  @Expose()
  gender: GenderEnum;

  @Expose()
  maritalStatus: MaritalStatusEnum;

  @Expose()
  @ToDateString()
  yearJoinedWorkforce: string;

  @Expose()
  completedSOD: boolean;

  @Expose()
  completedBibleCollege: boolean;
}
