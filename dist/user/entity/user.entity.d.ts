import { UserTypeI } from '../interface/UserTypeI';
import { UserType } from '../enums/user-type';
export declare abstract class User implements UserTypeI {
    abstract getType(): UserType;
    id: string;
    firstname: string;
    lastname: string;
    email: string;
    phoneNumber: string;
    changedPassword: boolean;
    password: string;
    createdAt: Date;
    updatedAt: Date;
}
