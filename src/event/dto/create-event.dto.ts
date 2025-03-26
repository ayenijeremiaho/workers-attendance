import { IsNotEmpty, IsOptional, Matches } from 'class-validator';
import { CreateEventConfigDto } from './create-event-config.dto';

export class CreateEventDto {
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

  @IsOptional()
  eventConfig: CreateEventConfigDto;
}
