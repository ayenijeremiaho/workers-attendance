import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { UtilityService } from '../utility/utility.service';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload, JwtResponse, UserAuth } from './interface/auth.interface';
import refreshJwtConfig from '../config/refresh.jwt.config';
import { ConfigType } from '@nestjs/config';
import { AdminService } from '../user/service/admin.service';
import { WorkerService } from '../user/service/worker.service';
import { UserSessionService } from '../user/service/user-session.service';
import { UserType } from '../user/enums/user-type';
import { User } from '../user/entity/user.entity';
import { WorkerDto } from '../user/dto/worker.dto';
import { AdminDto } from '../user/dto/admin.dto';
import { plainToClass } from 'class-transformer';
import { Admin } from '../user/entity/admin.entity';
import { UserChangePasswordDto } from '../user/dto/user-change-password.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly workerService: WorkerService,
    private readonly adminService: AdminService,
    private readonly utilityService: UtilityService,
    private readonly userSessionService: UserSessionService,
    @Inject(refreshJwtConfig.KEY)
    private readonly jwtRefreshConfig: ConfigType<typeof refreshJwtConfig>,
  ) {}

  async validateUser(
    email: string,
    password: string,
    userType: UserType,
  ): Promise<UserAuth> {
    this.logger.log(`Validating ${userType} user with email: ${email}`);

    const user = await this.getUser(userType, email);

    if (!user) throw new UnauthorizedException('Invalid email address');

    const passwordMatches = await this.utilityService.verifyHashedValue(
      password,
      user.password,
    );

    if (!passwordMatches)
      throw new UnauthorizedException('Invalid password provided');

    return { id: user.id, role: user.getType() };
  }

  async login(user: UserAuth, userType: UserType): Promise<JwtResponse> {
    return await this.generateTokensAndUpdateUser(user.id, userType);
  }

  async refreshToken(user: UserAuth, userType: UserType): Promise<JwtResponse> {
    return await this.generateTokensAndUpdateUser(user.id, userType);
  }

  async logout(user: UserAuth, userType: UserType): Promise<void> {
    await this.userSessionService.updateUserLogout(user.id, userType);
  }

  async validateRefreshToken(
    userId: string,
    userType: UserType,
    refreshToken: string,
  ): Promise<UserAuth> {
    const hashedUserRefreshToken =
      await this.userSessionService.getHashedUserRefreshToken(userId, userType);

    if (!hashedUserRefreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const isValid = await this.utilityService.verifyHashedValue(
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
    userType: UserType,
  ): Promise<UserAuth> {
    const hashedUserRefreshToken =
      await this.userSessionService.getHashedUserRefreshToken(userId, userType);

    if (!hashedUserRefreshToken)
      throw new UnauthorizedException('Invalid authorization token');

    return { id: userId, role: userType };
  }

  async getLoggedInUser(
    user: UserAuth,
    userType: UserType,
  ): Promise<Worker | Admin> {
    if (userType == UserType.WORKER) {
      return this.workerService.get(user.id);
    } else {
      return this.adminService.get(user.id);
    }
  }

  async changeUserPassword(
    user: UserAuth,
    userType: UserType,
    changePasswordDto: UserChangePasswordDto,
  ): Promise<string> {
    if (userType === UserType.WORKER) {
      return this.workerService.changePassword(user.id, changePasswordDto);
    } else {
      return this.adminService.changePassword(user.id, changePasswordDto);
    }
  }

  private async generateTokensAndUpdateUser(
    userId: string,
    userType: UserType,
  ) {
    const payload: JwtPayload = { sub: userId, role: userType };

    const access_token = await this.getAccessToken(payload);

    if (userType === UserType.WORKER) {
      return { access_token };
    }

    const refresh_token = await this.getRefreshToken(payload);

    const hashedRefreshToken =
      await this.utilityService.hashValue(refresh_token);

    await this.userSessionService.updateUserLogin(
      userId,
      userType,
      hashedRefreshToken,
    );

    return { access_token, refresh_token };
  }

  private async getRefreshToken(payload: JwtPayload) {
    return await this.jwtService.signAsync(payload, this.jwtRefreshConfig);
  }

  private async getAccessToken(payload: JwtPayload) {
    return await this.jwtService.signAsync(payload);
  }

  private async getUser(userType: UserType, email: string): Promise<User> {
    if (userType === UserType.ADMIN) {
      return await this.adminService.findByEmail(email);
    }

    return await this.workerService.findByEmail(email);
  }
}
