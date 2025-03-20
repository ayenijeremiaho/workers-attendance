import { Repository } from 'typeorm';
import { UserSession } from '../entity/user-session.entity';
import { UserType } from '../enums/user-type';
export declare class UserSessionService {
    private readonly userSessionRepository;
    private readonly logger;
    constructor(userSessionRepository: Repository<UserSession>);
    updateUserLogin(userId: string, userType: UserType, hashedRefreshToken: string): Promise<void>;
    updateUserLogout(userId: string, userType: UserType): Promise<void>;
    getHashedUserRefreshToken(userId: string, userType: UserType): Promise<string | null>;
    private findUserSessionByUserId;
}
