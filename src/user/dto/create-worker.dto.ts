import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsUUID,
  Matches,
} from 'class-validator';
import { CreateUserDto } from './create-user.dto';
import { MaritalStatusEnum } from '../enums/marital-status.enum';
import { GenderEnum } from '../enums/gender.enum';
import { DATE_OF_BIRTH_REGEX } from '../../utility/constants/regex.constant';

export class CreateWorkerDto extends CreateUserDto {
  @IsNotEmpty()
  @IsUUID('4', { message: 'invalid departmentId' })
  departmentId: string;

  @Matches(DATE_OF_BIRTH_REGEX, {
    message: 'dateOfBirth must be in MM-DD format',
  })
  dateOfBirth: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'yearBaptized must be in the format YYYY-MM-DD',
  })
  yearBaptized: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'yearBornAgain must be in the format YYYY-MM-DD',
  })
  yearBornAgain: string;

  @IsBoolean()
  baptizedWithHolyGhost: boolean;

  @IsNotEmpty()
  profession: string;

  @IsNotEmpty()
  @IsEnum(GenderEnum, {
    message: 'gender must be a valid enum value',
  })
  gender: GenderEnum;

  @IsNotEmpty()
  @IsEnum(MaritalStatusEnum, {
    message: 'maritalStatus must be a valid enum value',
  })
  maritalStatus: MaritalStatusEnum;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'yearJoinedChurch must be in the format YYYY-MM-DD',
  })
  yearJoinedChurch: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'yearJoinedWorkforce must be in the format YYYY-MM-DD',
  })
  yearJoinedWorkforce: string;

  @IsBoolean()
  completedSOD: boolean;

  @IsBoolean()
  completedBibleCollege: boolean;
}
