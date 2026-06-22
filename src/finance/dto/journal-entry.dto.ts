import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  JournalEntrySource,
  JournalEntryType,
  JournalLineType,
  JournalLinkRole,
  JournalLinkType,
} from '../enum/finance.enum';

export class JournalEntryLineDto {
  @IsUUID()
  accountId: string;

  @IsEnum(JournalLineType)
  entryType: JournalLineType;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount: number;
}

export class JournalEntryLinkDto {
  @IsEnum(JournalLinkType)
  linkType: JournalLinkType;

  @IsEnum(JournalLinkRole)
  role: JournalLinkRole;

  @IsOptional()
  @IsUUID()
  memberId?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsUUID()
  serviceEventId?: string;

  @IsOptional()
  @IsUUID()
  externalPayeeId?: string;
}

export class CreateJournalEntryDto {
  @IsDateString()
  date: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsEnum(JournalEntrySource)
  source: JournalEntrySource;

  @IsEnum(JournalEntryType)
  entryType: JournalEntryType;

  @IsUUID()
  accountingPeriodId: string;

  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;

  @IsOptional()
  @IsString()
  originalCurrency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  exchangeRate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  originalAmount?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JournalEntryLineDto)
  lines: JournalEntryLineDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JournalEntryLinkDto)
  links?: JournalEntryLinkDto[];
}

export class JournalEntryQueryDto {
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
  accountingPeriodId?: string;

  @IsOptional()
  @IsEnum(JournalEntrySource)
  source?: JournalEntrySource;

  @IsOptional()
  @IsEnum(JournalEntryType)
  entryType?: JournalEntryType;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}
