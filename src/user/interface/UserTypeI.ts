import { UserTypeEnum } from '../enums/user-type.enum';

export interface UserTypeI {
  getType(): UserTypeEnum;
}
