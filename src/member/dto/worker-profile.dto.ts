import { Expose, Type } from 'class-transformer';
import { WorkerStatusEnum } from '../enums/worker-status.enum';

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
  @Type(() => Object)
  department: { id: string; name: string };

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
