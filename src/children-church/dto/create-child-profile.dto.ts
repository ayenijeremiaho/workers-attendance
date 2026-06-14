import {IsDateString, IsNotEmpty, IsOptional, IsString, IsUrl, IsUUID} from 'class-validator';

export class CreateChildProfileDto {
    @IsString()
    @IsNotEmpty()
    firstname: string;

    @IsString()
    @IsNotEmpty()
    lastname: string;

    @IsDateString()
    dateOfBirth: string;

    @IsUrl({}, {message: 'photoUrl must be a valid URL'})
    @IsOptional()
    photoUrl?: string;

    @IsString()
    @IsOptional()
    specialNotes?: string;

    @IsUUID('4')
    @IsOptional()
    registeredByMemberId?: string;
}

export class UpdateChildProfileDto {
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    firstname?: string;

    @IsString()
    @IsNotEmpty()
    @IsOptional()
    lastname?: string;

    @IsDateString()
    @IsOptional()
    dateOfBirth?: string;

    @IsUrl({}, {message: 'photoUrl must be a valid URL'})
    @IsOptional()
    photoUrl?: string;

    @IsString()
    @IsOptional()
    specialNotes?: string;
}
