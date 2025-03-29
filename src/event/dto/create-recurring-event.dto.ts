import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Matches,
  Min,
} from 'class-validator';
import { CreateEventConfigDto } from './create-event-config.dto';
import { EventRecurrencePatternEnum } from '../enums/event-recurrence-patterns.enums';

export class CreateRecurringEventDto {
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsNotEmpty()
  description?: string;

  @Matches(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/, {
    message: 'startDate must be in the format YYYY-MM-DD HH:mm',
  })
  startDate: string;

  @Matches(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/, {
    message: 'endDate must be in the format YYYY-MM-DD HH:mm',
  })
  endDate: string;

  @IsEnum(EventRecurrencePatternEnum)
  recurrencePattern: EventRecurrencePatternEnum;

  @Min(1)
  @IsNumber()
  recurrenceInterval: number;

  @IsOptional()
  eventConfig: CreateEventConfigDto;
}
