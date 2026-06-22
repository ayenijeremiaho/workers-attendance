import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { NoteTypeEnum } from '../enums/note-type.enums';

export class ChildNamingRequest {
  @IsString()
  type: NoteTypeEnum.CHILD_NAMING;

  @IsNotEmpty()
  childName: string;

  @IsNotEmpty()
  familyName: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dateOfBirth must be YYYY-MM-DD' })
  dateOfBirth: string;
}

export class ChildDedicationRequest {
  @IsString()
  type: NoteTypeEnum.CHILD_DEDICATION;

  @IsNotEmpty()
  childName: string;

  @IsNotEmpty()
  familyName: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'dedicationDate must be YYYY-MM-DD',
  })
  dedicationDate: string;
}

export class MarriageRequest {
  @IsString()
  type: NoteTypeEnum.MARRIAGE;

  @IsNotEmpty()
  husbandName: string;

  @IsNotEmpty()
  wifeName: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'weddingDate must be YYYY-MM-DD' })
  weddingDate: string;
}
