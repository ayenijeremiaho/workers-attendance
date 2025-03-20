import { UserType } from '../enums/user-type';
export declare class UserSession {
    id: string;
    userId: string;
    userType: UserType;
    lastLogin: Date;
    lastLogout: Date;
    hashedRefreshToken: string;
    createdAt: Date;
    updatedAt: Date;
}
