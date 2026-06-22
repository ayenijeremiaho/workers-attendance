import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { GuardianRelationshipEnum } from '../enums/guardian-relationship.enum';

export class CreateGuardianDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsEnum(GuardianRelationshipEnum)
  relationship: GuardianRelationshipEnum;

  @IsString()
  @IsOptional()
  photoUrl?: string;

  @IsBoolean()
  @IsOptional()
  isAuthorizedPickup?: boolean;

  @IsUUID('4')
  @IsOptional()
  memberId?: string;
}
