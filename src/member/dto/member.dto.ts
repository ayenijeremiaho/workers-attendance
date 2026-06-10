import { Expose, Type } from 'class-transformer';
import { MemberRoleEnum } from '../enums/member-role.enum';
import { MemberStatusEnum } from '../enums/member-status.enum';
import { GenderEnum } from '../enums/gender.enum';
import { MaritalStatusEnum } from '../enums/marital-status.enum';
import { WorkerProfileDto } from './worker-profile.dto';

export class MemberDto {
  @Expose()
  id: string;

  @Expose()
  firstname: string;

  @Expose()
  lastname: string;

  @Expose()
  email: string;

  @Expose()
  phoneNumber: string;

  @Expose()
  role: MemberRoleEnum;

  @Expose()
  status: MemberStatusEnum;

  @Expose()
  gender: GenderEnum;

  @Expose()
  dateOfBirth: string;

  @Expose()
  maritalStatus: MaritalStatusEnum;

  @Expose()
  yearBornAgain: Date;

  @Expose()
  yearBaptized: Date;

  @Expose()
  baptizedWithHolyGhost: boolean;

  @Expose()
  yearJoinedChurch: Date;

  @Expose()
  changedPassword: boolean;

  @Expose()
  @Type(() => WorkerProfileDto)
  workerProfile: WorkerProfileDto;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
