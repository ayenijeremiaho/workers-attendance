import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ContactMethodEnum } from '../enums/follow-up.enum';

export class AddNoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;

  @IsOptional()
  @IsEnum(ContactMethodEnum)
  contactMethod?: ContactMethodEnum;
}
