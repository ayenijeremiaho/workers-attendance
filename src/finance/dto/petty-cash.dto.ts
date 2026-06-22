import {IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsUUID} from 'class-validator';
import {Type} from 'class-transformer';

export class CreatePettyCashReplenishmentDto {
    @IsUUID()
    fromAccountId: string;

    @IsUUID()
    toCashAccountId: string;

    @Type(() => Number)
    @IsNumber()
    @IsPositive()
    amount: number;

    @IsOptional()
    @IsString()
    notes?: string;
}

export class ApprovePettyCashDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    notes?: string;
}
