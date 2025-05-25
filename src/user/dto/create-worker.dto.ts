import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsUUID,
  Matches,
} from 'class-validator';
import { CreateUserDto } from './create-user.dto';
import { MaritalStatusEnum } from '../enums/marital-status.enum';

export class CreateWorkerDto extends CreateUserDto {
  @IsNotEmpty()
  @IsUUID('4', { message: 'invalid departmentId' })
  departmentId: string;

  // @Matches(/^\d{4}-\d{2}-\d{2}$/, {
  //   message: 'yearBaptized must be in the format YYYY-MM-DD',
  // })
  yearBaptized: string;

  // @Matches(/^\d{4}-\d{2}-\d{2}$/, {
  //   message: 'yearBornAgain must be in the format YYYY-MM-DD',
  // })
  yearBornAgain: string;

  // @IsNotEmpty()
  profession: string;

  // @IsNotEmpty()
  // @IsEnum(MaritalStatusEnum, {
  //   message: 'maritalStatus must be a valid enum value',
  // })
  maritalStatus: MaritalStatusEnum;

  // @Matches(/^\d{4}-\d{2}-\d{2}$/, {
  //   message: 'yearJoinedWorkforce must be in the format YYYY-MM-DD',
  // })
  yearJoinedWorkforce: string;

  // @IsBoolean()
  completedSOD: boolean;

  // @IsBoolean()
  completedBibleCollege: boolean;
}
