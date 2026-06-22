import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AmountConvention } from '../enum/finance.enum';

export class CreateBankImportProfileDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsString()
  delimiter: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  skipHeaderRows: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  dateColumnIndex: number;

  @IsString()
  dateFormat: string;

  @IsOptional()
  @IsString()
  dateColumnName?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  narrationColumnIndex: number;

  @IsOptional()
  @IsString()
  narrationColumnName?: string;

  @IsEnum(AmountConvention)
  amountConvention: AmountConvention;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  amountColumnIndex?: number;

  @IsOptional()
  @IsString()
  amountColumnName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  typeColumnIndex?: number;

  @IsOptional()
  @IsString()
  typeColumnName?: string;

  @IsOptional()
  @IsString()
  debitIndicator?: string;

  @IsOptional()
  @IsString()
  creditIndicator?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  debitColumnIndex?: number;

  @IsOptional()
  @IsString()
  debitColumnName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  creditColumnIndex?: number;

  @IsOptional()
  @IsString()
  creditColumnName?: string;
}

export class UpdateBankImportProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsString()
  delimiter?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skipHeaderRows?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  dateColumnIndex?: number;

  @IsOptional()
  @IsString()
  dateFormat?: string;

  @IsOptional()
  @IsString()
  dateColumnName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  narrationColumnIndex?: number;

  @IsOptional()
  @IsString()
  narrationColumnName?: string;

  @IsOptional()
  @IsEnum(AmountConvention)
  amountConvention?: AmountConvention;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  amountColumnIndex?: number;

  @IsOptional()
  @IsString()
  amountColumnName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  typeColumnIndex?: number;

  @IsOptional()
  @IsString()
  typeColumnName?: string;

  @IsOptional()
  @IsString()
  debitIndicator?: string;

  @IsOptional()
  @IsString()
  creditIndicator?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  debitColumnIndex?: number;

  @IsOptional()
  @IsString()
  debitColumnName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  creditColumnIndex?: number;

  @IsOptional()
  @IsString()
  creditColumnName?: string;
}
