import { WorkerDto } from '../../user/dto/worker.dto';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class DepartmentHodsDto {
  @Expose()
  name: string;

  @Expose()
  head: WorkerDto | null;

  @Expose()
  assistant: WorkerDto | null;
}
