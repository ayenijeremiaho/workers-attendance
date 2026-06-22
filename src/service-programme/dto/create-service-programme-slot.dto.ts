import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ServiceSlotTypeEnum } from '../enum/service-slot-type.enum';

export class CreateServiceProgrammeSlotDto {
  @IsEnum(ServiceSlotTypeEnum)
  type: ServiceSlotTypeEnum;

  @IsString()
  @IsOptional()
  topic?: string;

  @IsUUID()
  @IsOptional()
  memberId?: string;

  @IsString()
  @IsOptional()
  guestName?: string;

  @IsUUID()
  @IsOptional()
  backupMemberId?: string;

  @IsString()
  @IsOptional()
  backupGuestName?: string;

  @IsInt()
  @Min(1)
  @IsNotEmpty()
  allocatedMinutes: number;
}
