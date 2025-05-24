import { NoteTypeEnum } from '../enums/note-type.enums';
import { Event } from '../../event/entity/event.entity';

export class ChildNamingDetails {
  type: NoteTypeEnum.CHILD_NAMING;

  dateOfBirth: Date;

  familyName: string;
}

export class ChildDedicationDetails {
  type: NoteTypeEnum.CHILD_DEDICATION;

  dedicationDate: Date;

  familyName: string;
}

export class MarriageDetails {
  type: NoteTypeEnum.MARRIAGE;

  husbandName: string;

  wifeName: string;

  weddingDate: Date;
}

export class MemberAttendanceDetails {
  type: NoteTypeEnum.MEMBER_ATTENDANCE;

  totalAttendance: number;

  event: Event;
}
