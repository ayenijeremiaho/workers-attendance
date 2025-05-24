import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
  Matches,
  Min,
} from 'class-validator';
import { NoteTypeEnum } from '../enums/note-type.enums';

export class ChildNamingRequest {
  @IsString()
  type: NoteTypeEnum.CHILD_NAMING;

  @Matches(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/, {
    message: 'dateOfBirth must be in the format YYYY-MM-DD HH:mm',
  })
  dateOfBirth: string;

  @IsNotEmpty()
  childName: string;

  @IsNotEmpty()
  familyName: string;
}

export class ChildDedicationRequest {
  @IsString()
  type: NoteTypeEnum.CHILD_DEDICATION;

  @Matches(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/, {
    message: 'dedicationDate must be in the format YYYY-MM-DD HH:mm',
  })
  dedicationDate: Date;

  @IsNotEmpty()
  childName: string;

  @IsNotEmpty()
  familyName: string;
}

export class MarriageRequest {
  @IsString()
  type: NoteTypeEnum.MARRIAGE;

  @IsNotEmpty()
  husbandName: string;

  @IsNotEmpty()
  wifeName: string;

  @Matches(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/, {
    message: 'weddingDate must be in the format YYYY-MM-DD HH:mm',
  })
  weddingDate: Date;
}

export class MemberAttendanceRequest {
  @IsString()
  type: NoteTypeEnum.MEMBER_ATTENDANCE;

  @IsNumber()
  @Min(1, { message: 'totalAttendance must be greater than 0' })
  totalAttendance: number;

  @IsUUID('4', { message: 'invalid eventId' })
  eventId: string;
}
