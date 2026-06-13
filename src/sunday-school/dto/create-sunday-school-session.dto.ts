import {IsDateString, IsOptional, IsString, IsUUID} from 'class-validator';

export class CreateSundaySchoolSessionDto {
    @IsUUID('4')
    classId: string;

    @IsDateString()
    sessionDate: string;

    @IsString()
    @IsOptional()
    notes?: string;
}
