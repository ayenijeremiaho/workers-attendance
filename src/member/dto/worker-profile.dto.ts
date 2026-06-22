import { Expose, Type } from 'class-transformer';
import { WorkerStatusEnum } from '../enums/worker-status.enum';

export class DepartmentRefDto {
  @Expose()
  id: string;

  @Expose()
  name: string;
}

export class WorkerProfileDto {
  @Expose()
  id: string;

  @Expose()
  status: WorkerStatusEnum;

  @Expose()
  profession: string;

  @Expose()
  yearJoinedWorkforce: Date;

  @Expose()
  completedSOD: boolean;

  @Expose()
  completedBibleCollege: boolean;

  @Expose()
  @Type(() => DepartmentRefDto)
  department: DepartmentRefDto;

  @Expose()
  @Type(() => DepartmentRefDto)
  secondaryDepartment: DepartmentRefDto | null;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
