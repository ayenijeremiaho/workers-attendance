import { NoteTypeEnum } from '../enums/note-type.enums';
import { EventDto } from '../../event/dto/event.dto';
import { Exclude, Expose } from 'class-transformer';
import { ToDateString } from '../../utility/dto/date-converter';
import { NoteDetailsDto } from '../types/note-details.type';

@Exclude()
export class NoteDto {
  @Expose()
  id: string;

  @Expose()
  type: NoteTypeEnum;

  @Expose()
  details: NoteDetailsDto;

  @Expose()
  @ToDateString()
  createdAt: Date;

  @Expose()
  @ToDateString()
  updatedAt: Date;
}

@Exclude()
export class ChildNamingDetailsDto {
  @Expose()
  type: NoteTypeEnum.CHILD_NAMING;

  @Expose()
  @ToDateString()
  dateOfBirth: Date;

  @Expose()
  childName: string;

  @Expose()
  familyName: string;
}

@Exclude()
export class ChildDedicationDetailsDto {
  @Expose()
  type: NoteTypeEnum.CHILD_DEDICATION;

  @Expose()
  @ToDateString()
  dedicationDate: Date;

  @Expose()
  childName: string;

  @Expose()
  familyName: string;
}

@Exclude()
export class MarriageDetailsDto {
  @Expose()
  type: NoteTypeEnum.MARRIAGE;

  @Expose()
  husbandName: string;

  @Expose()
  wifeName: string;

  @Expose()
  @ToDateString()
  weddingDate: Date;
}

@Exclude()
export class MemberAttendanceDetailsDto {
  @Expose()
  type: NoteTypeEnum.MEMBER_ATTENDANCE;

  @Expose()
  totalAttendance: number;

  event: EventDto;
}
