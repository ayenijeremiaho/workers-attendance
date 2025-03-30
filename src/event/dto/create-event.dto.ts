import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Matches,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EventRecurrencePatternEnum } from '../enums/event-recurrence-patterns.enums';

class RecurrenceDto {
  @Matches(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/, {
    message: 'recurrenceEndDate must be in the format YYYY-MM-DD HH:mm',
  })
  recurrenceEndDate: string;

  @IsEnum(EventRecurrencePatternEnum)
  recurrencePattern: EventRecurrencePatternEnum;

  @Min(1)
  @IsNumber()
  recurrenceInterval: number;
}

export class CreateEventDto {
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsNotEmpty()
  description?: string;

  @Matches(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/, {
    message: 'startDate must be in the format YYYY-MM-DD HH:mm',
  })
  startEvent: string;

  @Matches(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/, {
    message: 'endDate must be in the format YYYY-MM-DD HH:mm',
  })
  endEvent: string;

  @IsBoolean()
  isRecurring: boolean;

  @ValidateIf((o) => o.isRecurring)
  @ValidateNested()
  @Type(() => RecurrenceDto)
  recurrence?: RecurrenceDto;

  @IsOptional()
  eventConfigId: string;
}
