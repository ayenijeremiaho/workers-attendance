import { Exclude, Expose } from 'class-transformer';
import { ToDateString } from '../../utility/dto/date-converter';

@Exclude()
export class EventConfigDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  checkinStartTimeInSeconds: number;

  @Expose()
  lateComingStartTimeInSeconds: number;

  @Expose()
  checkinStopTimeInSeconds: number;

  @Expose()
  locationLongitude: number;

  @Expose()
  locationLatitude: number;

  @Expose()
  @ToDateString()
  createdAt: string;

  @Expose()
  @ToDateString()
  updatedAt: string;
}
