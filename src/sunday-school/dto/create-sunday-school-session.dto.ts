import {IsDateString, IsInt, IsOptional, IsString, IsUUID, Max, Min} from 'class-validator';

export class CreateSundaySchoolSessionDto {
    @IsUUID('4')
    classId: string;

    @IsDateString()
    sessionDate: string;

    @IsString()
    @IsOptional()
    notes?: string;
}

export class OpenSelfMarkDto {
    @IsInt()
    @Min(5)
    @Max(480)
    closesInMinutes: number;
}
