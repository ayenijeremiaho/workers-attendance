import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService, ConfigType } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { randomInt } from 'node:crypto';
import { UtilityService } from '../../utility/service/utility.service';
import { CacheService } from '../../utility/service/cache.service';
import { MemberService } from '../../member/service/member.service';
import { MemberSessionService } from '../../member/service/member-session.service';
import { MemberStatusEnum } from '../../member/enums/member-status.enum';
import { MemberRoleEnum } from '../../member/enums/member-role.enum';
import { WorkerStatusEnum } from '../../member/enums/worker-status.enum';
import { JwtPayload, JwtResponse, MemberAuth } from '../interface/auth.interface';
import { PasswordResetOtp } from '../entity/password-reset-otp.entity';
import refreshJwtConfig from '../../config/refresh.jwt.config';
import { ChangePasswordDto } from '../../member/dto/change-password.dto';
import { SignupDto } from '../../member/dto/signup.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { Member } from '../../member/entity/member.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly otpTtlSeconds: number;
  private readonly otpMaxAttempts: number;
  private readonly otpWindowSeconds: number;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly memberService: MemberService,
    private readonly sessionService: MemberSessionService,
    private readonly utilityService: UtilityService,
    private readonly cacheService: CacheService,
    @Inject(refreshJwtConfig.KEY)
    private readonly jwtRefreshConfig: ConfigType<typeof refreshJwtConfig>,
    @InjectRepository(PasswordResetOtp)
    private readonly otpRepository: Repository<PasswordResetOtp>,
  ) {
    this.otpTtlSeconds = this.configService.get<number>('OTP_TTL_SECONDS', 900);
    this.otpMaxAttempts = this.configService.get<number>('FORGOT_PASSWORD_MAX_ATTEMPTS', 3);
    this.otpWindowSeconds = this.configService.get<number>('FORGOT_PASSWORD_WINDOW_SECONDS', 3600);
  }

  async validateMember(email: string, password: string): Promise<MemberAuth> {
    const member = await this.memberService.findByEmail(email);
    if (!member) throw new UnauthorizedException('Invalid email or password');

    const passwordMatches = await UtilityService.verifyHashedValue(password, member.password);
    if (!passwordMatches) throw new UnauthorizedException('Invalid email or password');

    if (member.status === MemberStatusEnum.INACTIVE) {
      throw new UnauthorizedException('Your account is inactive. Contact admin.');
    }

    if (member.role === MemberRoleEnum.WORKER && !member.workerProfile) {
      throw new UnauthorizedException('Worker access revoked. Please contact admin.');
    }

    if (member.workerProfile && member.workerProfile.status !== WorkerStatusEnum.ACTIVE) {
      throw new UnauthorizedException('Worker account suspended. Please contact admin.');
    }

    return { id: member.id, role: member.role, requiresPasswordChange: !member.changedPassword };
  }

  async signup(dto: SignupDto): Promise<Member> {
    return this.memberService.signup(dto);
  }

  async login(user: MemberAuth): Promise<JwtResponse> {
    const tokens = await this.generateTokens(user.id, user.role, user.requiresPasswordChange);

    this.memberService.getById(user.id).then((member) => {
      const firstName = UtilityService.capitalizeFirstLetter(member.firstname);
      const loginTime = new Date().toLocaleString('en-GB', { timeZone: 'Africa/Lagos' });
      this.utilityService.sendEmailWithTemplate(
        member.email,
        `${firstName}, New Discovery Hub Login Detected`,
        'login-notification',
        { name: firstName, loginTime },
      );
    }).catch(() => undefined);

    return tokens;
  }

  async refreshToken(user: MemberAuth): Promise<JwtResponse> {
    return this.generateTokens(user.id, user.role, user.requiresPasswordChange);
  }

  async logout(memberId: string): Promise<void> {
    await this.sessionService.updateLogout(memberId);
  }

  async validateRefreshToken(memberId: string, refreshToken: string): Promise<MemberAuth> {
    const hashed = await this.sessionService.getHashedRefreshToken(memberId);
    if (!hashed) throw new UnauthorizedException('Session not found');

    const isValid = await UtilityService.verifyHashedValue(refreshToken, hashed);
    if (!isValid) throw new UnauthorizedException('Invalid refresh token');

    const member = await this.memberService.getById(memberId, ['workerProfile']);

    if (member.status !== MemberStatusEnum.ACTIVE) {
      throw new UnauthorizedException('Account is inactive. Please contact admin.');
    }
    if (member.role === MemberRoleEnum.WORKER && !member.workerProfile) {
      throw new UnauthorizedException('Worker access revoked. Please log in again.');
    }
    if (member.workerProfile && member.workerProfile.status !== WorkerStatusEnum.ACTIVE) {
      throw new UnauthorizedException('Worker account suspended. Please log in again.');
    }

    return { id: member.id, role: member.role, requiresPasswordChange: !member.changedPassword };
  }

  async validateAccessToken(memberId: string): Promise<MemberAuth> {
    const hashed = await this.sessionService.getHashedRefreshToken(memberId);
    if (!hashed) throw new UnauthorizedException('Session expired. Please log in again.');

    const member = await this.memberService.getById(memberId, ['workerProfile']);

    if (member.status !== MemberStatusEnum.ACTIVE) {
      throw new UnauthorizedException('Account is inactive. Please contact admin.');
    }
    if (member.role === MemberRoleEnum.WORKER && !member.workerProfile) {
      throw new UnauthorizedException('Worker access revoked. Please log in again.');
    }
    if (member.workerProfile && member.workerProfile.status !== WorkerStatusEnum.ACTIVE) {
      throw new UnauthorizedException('Worker account suspended. Please log in again.');
    }

    return { id: member.id, role: member.role, requiresPasswordChange: !member.changedPassword };
  }

  async getProfile(memberId: string): Promise<Member> {
    return this.memberService.getById(memberId, ['workerProfile', 'workerProfile.department']);
  }

  async changePassword(memberId: string, dto: ChangePasswordDto): Promise<string> {
    return this.memberService.changePassword(memberId, dto);
  }

  async forgotPassword(email: string): Promise<void> {
    this.checkOtpRateLimit(email);

    const member = await this.memberService.findByEmail(email);
    if (!member) return; // Silent — do not leak account existence

    await this.otpRepository.delete({ memberId: member.id, usedAt: IsNull() });

    const otp = this.generateOtp();
    const otpHash = await UtilityService.hashValue(otp);
    const expiresAt = new Date(Date.now() + this.otpTtlSeconds * 1000);

    await this.otpRepository.save(
      this.otpRepository.create({ memberId: member.id, otpHash, expiresAt, usedAt: null }),
    );

    const firstName = UtilityService.capitalizeFirstLetter(member.firstname);
    this.utilityService.sendEmailWithTemplate(
      member.email,
      `${firstName}, Your Discovery Hub Password Reset Code`,
      'forgot-password-otp',
      { name: firstName, otp, expiresMinutes: Math.floor(this.otpTtlSeconds / 60).toString() },
    );
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const member = await this.memberService.findByEmail(dto.email);
    if (!member) throw new BadRequestException('Invalid or expired reset code');

    const otpRecord = await this.otpRepository.findOne({
      where: { memberId: member.id, usedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });

    if (!otpRecord || otpRecord.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    const isValid = await UtilityService.verifyHashedValue(dto.otp, otpRecord.otpHash);
    if (!isValid) throw new BadRequestException('Invalid or expired reset code');

    otpRecord.usedAt = new Date();
    await this.otpRepository.save(otpRecord);

    await Promise.all([
      this.memberService.setPassword(member.id, dto.newPassword, true),
      this.sessionService.updateLogout(member.id),
    ]);

    const firstName = UtilityService.capitalizeFirstLetter(member.firstname);
    this.utilityService.sendEmailWithTemplate(
      member.email,
      `${firstName}, Your Discovery Hub Password Has Been Changed`,
      'password-changed',
      { name: firstName, login_url: process.env.LOGIN_URL },
    );
  }

  private checkOtpRateLimit(email: string): void {
    const key = this.cacheService.key('otp_rate', email);
    const count = this.cacheService.get<number>(key) ?? 0;

    if (count >= this.otpMaxAttempts) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'TOO_MANY_REQUESTS',
          message: 'Too many password reset requests. Please try again later.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.cacheService.set(key, count + 1, this.otpWindowSeconds);
  }

  private generateOtp(): string {
    return randomInt(0, 1000000).toString().padStart(6, '0');
  }

  private async generateTokens(memberId: string, role: MemberRoleEnum, requiresPasswordChange: boolean): Promise<JwtResponse> {
    const payload: JwtPayload = { sub: memberId, role };

    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, this.jwtRefreshConfig),
    ]);

    const hashedRefreshToken = await UtilityService.hashValue(refresh_token);
    await this.sessionService.updateLogin(memberId, hashedRefreshToken);

    return {
      token_type: 'Bearer',
      expires_in: this.getTokenExpirySeconds(),
      access_token,
      refresh_token,
      requires_password_change: requiresPasswordChange,
    };
  }

  private getTokenExpirySeconds(): number {
    const expiry = this.configService.get<string>('JWT_EXPIRY_IN');
    if (!expiry) return 0;
    const match = /^(\d+)([smhd])$/i.exec(expiry);
    if (!match) return 0;
    const value = Number.parseInt(match[1], 10);
    const units: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return value * (units[match[2].toLowerCase()] ?? 0);
  }
}
