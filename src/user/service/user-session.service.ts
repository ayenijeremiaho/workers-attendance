import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserSession } from '../entity/user-session.entity';
import { UserType } from '../enums/user-type';

@Injectable()
export class UserSessionService {
  private readonly logger = new Logger(UserSessionService.name);

  constructor(
    @InjectRepository(UserSession)
    private readonly userSessionRepository: Repository<UserSession>,
  ) {}

  async updateUserLogin(
    userId: string,
    userType: UserType,
    hashedRefreshToken: string,
  ): Promise<void> {
    let userSession = await this.findUserSessionByUserId(userId, userType);

    if (userSession) {
      try {
        userSession.hashedRefreshToken = hashedRefreshToken;
        userSession.lastLogin = new Date();
        await this.userSessionRepository.save(userSession);

        this.logger.log(`Updated ${userType} - ${userId} session`);
      } catch (e) {
        this.logger.error("An error occurred while updating user's session", e);
      }

      return;
    }

    userSession = new UserSession();
    userSession.userId = userId;
    userSession.userType = userType;
    userSession.hashedRefreshToken = hashedRefreshToken;
    userSession.lastLogin = new Date();

    await this.userSessionRepository.save(userSession);

    this.logger.log(`Created ${userType} - ${userId} session`);
  }

  async updateUserLogout(userId: string, userType: UserType): Promise<void> {
    const userSession = await this.findUserSessionByUserId(userId, userType);

    if (!userSession) {
      return;
    }

    userSession.hashedRefreshToken = null;
    userSession.lastLogout = new Date();
    await this.userSessionRepository.save(userSession);
  }

  async getHashedUserRefreshToken(
    userId: string,
    userType: UserType,
  ): Promise<string | null> {
    const userSession = await this.findUserSessionByUserId(userId, userType);

    if (!userSession) {
      return null;
    }

    return userSession.hashedRefreshToken;
  }

  private async findUserSessionByUserId(userId: string, userType: UserType) {
    return await this.userSessionRepository.findOneBy({
      userId,
      userType,
    });
  }
}
