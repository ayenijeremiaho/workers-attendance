import {IsInt, IsNotEmpty, IsOptional, IsString, Min} from 'class-validator';

export class CreateChildAgeGroupDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsInt()
    @Min(0)
    minAgeMonths: number;

    @IsInt()
    @Min(1)
    maxAgeMonths: number;

    @IsInt()
    @Min(0)
    @IsOptional()
    displayOrder?: number;
}

export class UpdateChildAgeGroupDto {
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    name?: string;

    @IsInt()
    @Min(0)
    @IsOptional()
    minAgeMonths?: number;

    @IsInt()
    @Min(1)
    @IsOptional()
    maxAgeMonths?: number;

    @IsInt()
    @Min(0)
    @IsOptional()
    displayOrder?: number;
}
