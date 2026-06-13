import {IsEmail, IsString, MinLength} from 'class-validator';
import {NormalizeEmail} from '../../utility/decorators/normalize-email.decorator';

export class RequestDeviceResetDto {
    @NormalizeEmail()
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(8)
    newDeviceId: string;
}

export class VerifyDeviceResetDto {
    @NormalizeEmail()
    @IsEmail()
    email: string;

    @IsString()
    otp: string;
}
