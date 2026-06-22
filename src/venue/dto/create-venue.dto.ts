import {
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateVenueDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsLatitude()
  latitude: number;

  @IsLongitude()
  longitude: number;
}

export class UpdateVenueDto extends PartialType(CreateVenueDto) {}
