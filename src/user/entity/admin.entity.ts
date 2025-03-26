import { Entity } from 'typeorm';
import { User } from './user.entity';
import { UserTypeEnum } from '../enums/user-type.enum';

@Entity({ name: 'admins' })
export class Admin extends User {
  public getType(): UserTypeEnum {
    return UserTypeEnum.ADMIN;
  }
}
