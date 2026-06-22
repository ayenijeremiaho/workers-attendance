import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OfferingType } from '../enum/finance.enum';

export class CreateOfferingDto {
  @IsOptional()
  @IsUUID()
  serviceEventId?: string;

  @IsUUID()
  fundId: string;

  @IsEnum(OfferingType)
  type: OfferingType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cashAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  expectedTransferAmount?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class OfferingQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsUUID()
  fundId?: string;

  @IsOptional()
  @IsEnum(OfferingType)
  type?: OfferingType;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}

export class ReconcileOfferingDto {
  @IsString()
  @IsNotEmpty()
  notes: string;

  @IsOptional()
  @IsBoolean()
  autoJournal?: boolean;

  @ValidateIf((o) => o.autoJournal === true)
  @IsUUID()
  debitAccountId?: string;

  @ValidateIf((o) => o.autoJournal === true)
  @IsUUID()
  creditAccountId?: string;

  @ValidateIf((o) => o.autoJournal === true)
  @IsUUID()
  accountingPeriodId?: string;
}
