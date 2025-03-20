import { User } from './user.entity';
import { UserType } from '../enums/user-type';
export declare class Admin extends User {
    getType(): UserType;
}
