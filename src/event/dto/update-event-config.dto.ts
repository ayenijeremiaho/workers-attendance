import { IsOptional, IsNumber, IsLatitude, IsLongitude } from 'class-validator';

export class UpdateEventConfigDto {
  @IsOptional()
  @IsNumber()
  checkinStartTimeInSeconds?: number;

  @IsOptional()
  @IsNumber()
  lateComingStartTimeInSeconds?: number;

  @IsOptional()
  @IsLatitude()
  defaultLocationLatitude?: number;

  @IsOptional()
  @IsLongitude()
  defaultLocationLongitude?: number;
}
