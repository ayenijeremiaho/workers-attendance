import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RentalDiscountType } from '../enum/rental.enum';

export class BookingAddonItemDto {
  @IsUUID()
  addonId: string;

  @IsNumber()
  @IsPositive()
  @Min(1)
  quantity: number;
}

export class CreateRentalBookingDto {
  @IsUUID()
  facilityId: string;

  @IsDateString()
  startDateTime: string;

  @IsDateString()
  endDateTime: string;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingAddonItemDto)
  addons?: BookingAddonItemDto[];
}

export class ApplyOverrideDiscountDto {
  @IsEnum(RentalDiscountType)
  overrideDiscountType: RentalDiscountType;

  @IsNumber()
  @IsPositive()
  overrideDiscountValue: number;

  @IsOptional()
  @IsString()
  overrideDiscountNote?: string;
}

export class ConfirmBookingDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectBookingDto {
  @IsString()
  rejectionReason: string;
}
