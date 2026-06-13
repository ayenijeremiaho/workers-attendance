import {IsDateString, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsUUID, MaxLength} from 'class-validator';
import {Type} from 'class-transformer';

export class MatchUnmatchedDto {
    @IsUUID()
    @IsNotEmpty()
    memberId: string;
}

export class DownloadTitheDto {
    @IsNotEmpty()
    @IsUUID()
    memberId: string;
}

export class SubmitTitheProofDto {
    @Type(() => Number)
    @IsNumber()
    @IsPositive()
    amount: number;

    @IsDateString()
    paymentDate: string;

    @IsString()
    @IsOptional()
    bankName?: string;

    @IsString()
    @IsOptional()
    reference?: string;
}

export class DeclineTitheProofDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(500)
    financeNote: string;
}
