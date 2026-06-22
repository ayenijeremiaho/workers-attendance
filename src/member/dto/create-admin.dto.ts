import { IsEmail, IsOptional, IsString } from 'class-validator';
import { NormalizeEmail } from '../../utility/decorators/normalize-email.decorator';

export class CreateAdminDto {
  @IsString()
  firstname: string;

  @IsString()
  lastname: string;

  @NormalizeEmail()
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;
}
