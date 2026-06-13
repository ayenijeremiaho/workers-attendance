import {IsEmail} from 'class-validator';
import {NormalizeEmail} from '../../utility/decorators/normalize-email.decorator';

export class ForgotPasswordDto {
    @NormalizeEmail()
    @IsEmail({}, {message: 'Invalid email format'})
    email: string;
}
