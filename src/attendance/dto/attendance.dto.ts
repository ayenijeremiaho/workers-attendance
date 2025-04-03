import { CheckInStatusEnum } from '../enums/check-in.enum';
import { EventDto } from '../../event/dto/event.dto';
import { Exclude, Expose } from 'class-transformer';
import { WorkerDto } from '../../user/dto/worker.dto';
import { ToDateString } from '../../utility/dto/date-converter';

@Exclude()
export class AttendanceDto {
  @Expose()
  id: string;

  @Expose()
  event: EventDto;

  @Expose()
  worker: WorkerDto;

  @Expose()
  @ToDateString()
  checkinTime: Date;

  @Expose()
  checkinStatus: CheckInStatusEnum;

  @Expose()
  workerLocation: {
    longitude: number;
    latitude: number;
  };

  @Expose()
  @ToDateString()
  createdAt: Date;

  @Expose()
  @ToDateString()
  updatedAt: Date;
}
