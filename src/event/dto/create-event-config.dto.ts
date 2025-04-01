import {
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  Min,
} from 'class-validator';

export class CreateEventConfigDto {
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(60)
  checkinStartTimeInSeconds: number;

  @IsNumber()
  @Min(120)
  lateComingStartTimeInSeconds: number;

  @IsNumber()
  @Min(180)
  checkinStopTimeInSeconds: number;

  @IsLatitude()
  locationLatitude: number;

  @IsLongitude()
  locationLongitude: number;
}
