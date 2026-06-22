import {IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString} from 'class-validator';
import {FundType} from '../enum/finance.enum';

export class CreateFundDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsEnum(FundType)
    type: FundType;

    @IsOptional()
    @IsString()
    description?: string;
}

export class UpdateFundDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    name?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
