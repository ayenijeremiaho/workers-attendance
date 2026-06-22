import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ReconciliationRowStatus } from '../enum/finance.enum';

export class PostConfirmedRowsDto {
  @IsUUID()
  bankAccountId: string;

  @IsUUID()
  accountingPeriodId: string;
}

export class ConfirmReconciliationRowDto {
  @IsUUID()
  accountId: string;

  @IsOptional()
  @IsString()
  matchNote?: string;
}

export class BulkConfirmRowDto {
  @IsUUID()
  rowId: string;

  @IsUUID()
  accountId: string;
}

export class BulkConfirmReconciliationDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkConfirmRowDto)
  rows: BulkConfirmRowDto[];
}

export class SkipReconciliationRowDto {
  @IsOptional()
  @IsString()
  matchNote?: string;
}

export class ReconciliationRowQueryDto {
  @IsOptional()
  @IsEnum(ReconciliationRowStatus)
  status?: ReconciliationRowStatus;
}
