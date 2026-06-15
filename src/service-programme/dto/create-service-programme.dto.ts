import {IsBoolean, IsNotEmpty, IsOptional, IsUUID} from 'class-validator';

export class CreateServiceProgrammeDto {
    @IsUUID()
    @IsNotEmpty()
    serviceSlotId: string;

    @IsBoolean()
    @IsOptional()
    saveAsTemplate?: boolean;
}
