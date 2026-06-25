import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateRentalCalendarBlockDto {
  @IsUUID()
  facilityId: string;

  @IsDateString()
  startDateTime: string;

  @IsDateString()
  endDateTime: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
