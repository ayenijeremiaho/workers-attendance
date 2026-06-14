import {
    IsBoolean,
    IsEmail,
    IsEnum,
    IsOptional,
    IsPhoneNumber,
    IsString,
    IsUUID,
    MaxLength,
    MinLength,
} from 'class-validator';
import {FirstTimerSourceEnum} from '../enums/follow-up.enum';

export class CreateFirstTimerDto {
    @IsString()
    @MinLength(1)
    @MaxLength(100)
    firstname: string;

    @IsString()
    @MinLength(1)
    @MaxLength(100)
    lastname: string;

    @IsString()
    @MinLength(7)
    @MaxLength(20)
    phone: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsEnum(FirstTimerSourceEnum)
    source?: FirstTimerSourceEnum;

    @IsOptional()
    @IsBoolean()
    wantsToJoinChurch?: boolean;

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    enjoyedAboutChurch?: string;

    @IsOptional()
    @IsBoolean()
    wantsToJoinWorkforce?: boolean;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    notes?: string;

    @IsOptional()
    @IsUUID()
    visitedEventId?: string;
}
