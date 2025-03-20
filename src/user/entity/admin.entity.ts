import { Entity } from 'typeorm';
import { User } from './user.entity';
import { UserType } from '../enums/user-type';

@Entity({ name: 'admins' })
export class Admin extends User {
  public getType(): UserType {
    return UserType.ADMIN;
  }
}
