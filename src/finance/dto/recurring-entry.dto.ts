import {IsBoolean, IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsUUID} from 'class-validator';
import {Type} from 'class-transformer';
import {RecurringFrequency} from '../enum/finance.enum';

export class CreateRecurringEntryDto {
    @IsString()
    @IsNotEmpty()
    description: string;

    @IsUUID()
    debitAccountId: string;

    @IsUUID()
    creditAccountId: string;

    @Type(() => Number)
    @IsNumber()
    @IsPositive()
    amount: number;

    @IsEnum(RecurringFrequency)
    frequency: RecurringFrequency;

    @IsUUID()
    fundId: string;

    @IsDateString()
    nextDueAt: string;
}

export class UpdateRecurringEntryDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    description?: string;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @IsPositive()
    amount?: number;

    @IsOptional()
    @IsDateString()
    nextDueAt?: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
