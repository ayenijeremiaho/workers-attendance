import { IsEmail, IsString, Length, Matches, MinLength } from 'class-validator';
import { NormalizeEmail } from '../../utility/decorators/normalize-email.decorator';

export class ResetPasswordDto {
  @NormalizeEmail()
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @IsString()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  otp: string;

  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  @Matches(/[A-Z]/, { message: 'New password must contain at least one uppercase letter' })
  @Matches(/\d/, { message: 'New password must contain at least one number' })
  @Matches(/[@$!%*?&]/, { message: 'New password must contain at least one special character (@$!%*?&)' })
  newPassword: string;
}
