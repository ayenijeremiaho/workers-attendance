import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { GenderEnum } from '../enums/gender.enum';
import { MaritalStatusEnum } from '../enums/marital-status.enum';

export class UpdateMemberDto {
  @IsOptional()
  @IsString()
  firstname?: string;

  @IsOptional()
  @IsString()
  lastname?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsEnum(GenderEnum)
  gender?: GenderEnum;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dateOfBirth must be YYYY-MM-DD' })
  dateOfBirth?: string;

  @IsOptional()
  @IsEnum(MaritalStatusEnum)
  maritalStatus?: MaritalStatusEnum;

  @IsOptional()
  @Matches(/^\d{4}$/, { message: 'yearBornAgain must be a 4-digit year' })
  yearBornAgain?: string;

  @IsOptional()
  @Matches(/^\d{4}$/, { message: 'yearBaptized must be a 4-digit year' })
  yearBaptized?: string;

  @IsOptional()
  @IsBoolean()
  baptizedWithHolyGhost?: boolean;

  @IsOptional()
  @Matches(/^\d{4}$/, { message: 'yearJoinedChurch must be a 4-digit year' })
  yearJoinedChurch?: string;
}
