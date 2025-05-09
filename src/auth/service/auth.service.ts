import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { UtilityService } from '../../utility/service/utility.service';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload, JwtResponse, UserAuth } from '../interface/auth.interface';
import refreshJwtConfig from '../../config/refresh.jwt.config';
import { ConfigService, ConfigType } from '@nestjs/config';
import { AdminService } from '../../user/service/admin.service';
import { WorkerService } from '../../user/service/worker.service';
import { UserSessionService } from '../../user/service/user-session.service';
import { UserTypeEnum } from '../../user/enums/user-type.enum';
import { User } from '../../user/entity/user.entity';
import { Admin } from '../../user/entity/admin.entity';
import { UserChangePasswordDto } from '../../user/dto/user-change-password.dto';
import { Worker } from '../../user/entity/worker.entity';
import { WorkerStatusEnum } from '../../user/enums/worker-status.enum';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly workerService: WorkerService,
    private readonly adminService: AdminService,
    private readonly userSessionService: UserSessionService,
    @Inject(refreshJwtConfig.KEY)
    private readonly jwtRefreshConfig: ConfigType<typeof refreshJwtConfig>,
  ) {}

  async validateUser(
    email: string,
    password: string,
    userType: UserTypeEnum,
  ): Promise<UserAuth> {
    this.logger.log(`Validating ${userType} user with email: ${email}`);

    const user = await this.getUser(userType, email);

    if (!user) throw new UnauthorizedException('Invalid email address');

    const passwordMatches = await UtilityService.verifyHashedValue(
      password,
      user.password,
    );

    if (!passwordMatches)
      throw new UnauthorizedException('Invalid password provided');

    if (userType === UserTypeEnum.WORKER) {
      const worker = user as Worker;
      if (worker.status === WorkerStatusEnum.INACTIVE)
        throw new UnauthorizedException('User is inactive, contact admin');
    }

    return { id: user.id, role: user.getType() };
  }

  async login(user: UserAuth, userType: UserTypeEnum): Promise<JwtResponse> {
    return await this.generateTokensAndUpdateUser(user.id, userType);
  }

  async refreshToken(
    user: UserAuth,
    userType: UserTypeEnum,
  ): Promise<JwtResponse> {
    return await this.generateTokensAndUpdateUser(user.id, userType);
  }

  async logout(user: UserAuth, userType: UserTypeEnum): Promise<void> {
    await this.userSessionService.updateUserLogout(user.id, userType);
  }

  async validateRefreshToken(
    userId: string,
    userType: UserTypeEnum,
    refreshToken: string,
  ): Promise<UserAuth> {
    const hashedUserRefreshToken =
      await this.userSessionService.getHashedUserRefreshToken(userId, userType);

    if (!hashedUserRefreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const isValid = await UtilityService.verifyHashedValue(
      refreshToken,
      hashedUserRefreshToken,
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return { id: userId, role: userType };
  }

  async validateAccessToken(
    userId: string,
    userType: UserTypeEnum,
  ): Promise<UserAuth> {
    const hashedUserRefreshToken =
      await this.userSessionService.getHashedUserRefreshToken(userId, userType);

    if (!hashedUserRefreshToken)
      throw new UnauthorizedException('Invalid authorization token');

    return { id: userId, role: userType };
  }

  async getLoggedInUser(
    user: UserAuth,
    userType: UserTypeEnum,
  ): Promise<Worker | Admin> {
    if (userType == UserTypeEnum.WORKER) {
      return this.workerService.get(user.id, true);
    } else {
      return this.adminService.get(user.id);
    }
  }

  async changeUserPassword(
    user: UserAuth,
    userType: UserTypeEnum,
    changePasswordDto: UserChangePasswordDto,
  ): Promise<string> {
    if (userType === UserTypeEnum.WORKER) {
      return this.workerService.changePassword(user.id, changePasswordDto);
    } else {
      return this.adminService.changePassword(user.id, changePasswordDto);
    }
  }

  private async generateTokensAndUpdateUser(
    userId: string,
    userType: UserTypeEnum,
  ) {
    const payload: JwtPayload = { sub: userId, role: userType };

    const access_token = await this.getAccessToken(payload);

    const refresh_token = await this.getRefreshToken(payload);

    const hashedRefreshToken = await UtilityService.hashValue(refresh_token);

    await this.userSessionService.updateUserLogin(
      userId,
      userType,
      hashedRefreshToken,
    );

    return {
      token_type: 'Bearer',
      expires_in: this.getTokenExpiry(),
      access_token,
      refresh_token,
    };
  }

  private getTokenExpiry(): number {
    const expiry = this.configService.get<string>('JWT_EXPIRY_IN');
    if (!expiry || typeof expiry !== 'string') {
      return 0;
    }

    const match = RegExp(/^(\d+)([smhd])$/i).exec(expiry);
    if (!match) {
      return 0;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 0;
    }
  }

  private async getRefreshToken(payload: JwtPayload) {
    return await this.jwtService.signAsync(payload, this.jwtRefreshConfig);
  }

  private async getAccessToken(payload: JwtPayload) {
    return await this.jwtService.signAsync(payload);
  }

  private async getUser(userType: UserTypeEnum, email: string): Promise<User> {
    if (userType === UserTypeEnum.ADMIN) {
      return await this.adminService.findByEmail(email);
    }

    return await this.workerService.findByEmail(email);
  }
}
