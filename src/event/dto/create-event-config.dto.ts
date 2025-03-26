import { IsLatitude, IsLongitude, IsNumber, Min } from 'class-validator';

export class CreateEventConfigDto {
  @IsNumber()
  @Min(60)
  checkinStartTimeInSeconds: number;

  @IsNumber()
  @Min(60)
  lateComingStartTimeInSeconds: number;

  @IsLatitude()
  locationLatitude: number;

  @IsLongitude()
  locationLongitude: number;
}
