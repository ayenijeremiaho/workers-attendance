import {
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateServiceHeadcountDto {
  @IsUUID()
  @IsNotEmpty()
  serviceSlotId: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  maleAdults?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  femaleAdults?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  teenagers?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  children?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  mobileChurch?: number;

  @IsObject()
  @IsOptional()
  customGroups?: Record<string, number>;

  @IsString()
  @IsOptional()
  notes?: string;
}
