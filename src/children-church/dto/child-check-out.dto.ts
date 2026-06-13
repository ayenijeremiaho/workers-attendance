import {IsNotEmpty, IsOptional, IsString, IsUUID} from 'class-validator';

export class ChildCheckOutDto {
    @IsString()
    @IsNotEmpty()
    pickupCode: string;

    @IsUUID('4')
    @IsOptional()
    pickedUpByGuardianId?: string;

    @IsString()
    @IsOptional()
    pickedUpByName?: string;
}
