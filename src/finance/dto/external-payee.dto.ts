import {IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString} from 'class-validator';
import {ExternalPayeeType} from '../enum/finance.enum';

export class CreateExternalPayeeDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsEnum(ExternalPayeeType)
    type: ExternalPayeeType;

    @IsOptional()
    @IsEmail()
    contactEmail?: string;

    @IsOptional()
    @IsString()
    contactPhone?: string;

    @IsOptional()
    @IsString()
    accountNumber?: string;

    @IsOptional()
    @IsString()
    bankName?: string;

    @IsOptional()
    @IsString()
    registrationNumber?: string;

    @IsOptional()
    @IsString()
    notes?: string;
}

export class UpdateExternalPayeeDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    name?: string;

    @IsOptional()
    @IsEnum(ExternalPayeeType)
    type?: ExternalPayeeType;

    @IsOptional()
    @IsEmail()
    contactEmail?: string;

    @IsOptional()
    @IsString()
    contactPhone?: string;

    @IsOptional()
    @IsString()
    accountNumber?: string;

    @IsOptional()
    @IsString()
    bankName?: string;

    @IsOptional()
    @IsString()
    registrationNumber?: string;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
