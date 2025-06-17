import { Exclude, Expose, Type } from 'class-transformer';
import { ToDateString } from '../../utility/dto/date-converter';
import { EventConfigDto } from './event-config.dto';

@Exclude()
export class EventDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  description: string;

  @Expose()
  @ToDateString()
  startDate: string;

  @Expose()
  @ToDateString()
  endDate: string;

  @Expose()
  @Type(() => EventConfigDto)
  eventConfig: EventConfigDto;

  @Expose()
  recurringEventId: string;

  @Expose()
  @ToDateString()
  createdAt: string;

  @Expose()
  @ToDateString()
  updatedAt: string;
}
