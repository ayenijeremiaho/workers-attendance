import { IsEnum, IsUUID } from 'class-validator';
import { EnrollmentStatusEnum } from '../enum/enrollment-status.enum';

export class EnrollMemberDto {
  @IsUUID()
  memberId: string;

  @IsUUID()
  classId: string;
}

export class UpdateEnrollmentStatusDto {
  @IsEnum(EnrollmentStatusEnum)
  status: EnrollmentStatusEnum;
}
