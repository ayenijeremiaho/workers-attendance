import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateEventConfigDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID()
  defaultVenueId: string;

  @IsInt()
  workerCheckinStartOffsetSeconds: number;

  @IsInt()
  @Min(0)
  workerLateOffsetSeconds: number;

  @IsInt()
  memberCheckinStartOffsetSeconds: number;

  @IsInt()
  @Min(0)
  checkinStopOffsetSeconds: number;

  @IsNumber()
  @Min(5)
  allowedDistanceInMeters: number;
}
