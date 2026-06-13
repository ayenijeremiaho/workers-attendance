import {IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsUUID, MaxLength} from 'class-validator';
import {Type} from 'class-transformer';

export class CreateFinanceCategoryDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name: string;

    @IsString()
    @IsOptional()
    @MaxLength(255)
    description?: string;
}

export class UpdateFinanceCategoryDto {
    @IsString()
    @IsOptional()
    @MaxLength(100)
    name?: string;

    @IsString()
    @IsOptional()
    @MaxLength(255)
    description?: string;
}

export class CreateFinanceRequestDto {
    @IsUUID()
    @IsNotEmpty()
    categoryId: string;

    @IsUUID()
    @IsNotEmpty()
    departmentId: string;

    @IsString()
    @IsNotEmpty()
    reason: string;

    @IsNumber()
    @IsPositive()
    @Type(() => Number)
    amount: number;

    @IsString()
    @IsNotEmpty()
    recipientBankName: string;

    @IsString()
    @IsNotEmpty()
    recipientAccountNumber: string;

    @IsString()
    @IsNotEmpty()
    recipientAccountName: string;
}

export class RejectFinanceRequestDto {
    @IsString()
    @IsNotEmpty()
    rejectionReason: string;
}
