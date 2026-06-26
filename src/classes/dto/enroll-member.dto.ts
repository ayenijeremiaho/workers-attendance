import { IsArray, IsEnum, IsUUID, ArrayMinSize } from 'class-validator';
import { EnrollmentStatusEnum } from '../enum/enrollment-status.enum';

export class EnrollMemberDto {
  @IsUUID()
  memberId: string;

  @IsUUID()
  classId: string;
}

export class BulkEnrollDto {
  @IsUUID()
  classId: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(undefined, { each: true })
  memberIds: string[];
}

export class UpdateEnrollmentStatusDto {
  @IsEnum(EnrollmentStatusEnum)
  status: EnrollmentStatusEnum;
}
