import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService, ConfigType } from '@nestjs/config';
import { UtilityService } from '../../utility/service/utility.service';
import { MemberService } from '../../member/service/member.service';
import { MemberSessionService } from '../../member/service/member-session.service';
import { MemberStatusEnum } from '../../member/enums/member-status.enum';
import { JwtPayload, JwtResponse, MemberAuth } from '../interface/auth.interface';
import refreshJwtConfig from '../../config/refresh.jwt.config';
import { ChangePasswordDto } from '../../member/dto/change-password.dto';
import { SignupDto } from '../../member/dto/signup.dto';
import { Member } from '../../member/entity/member.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly memberService: MemberService,
    private readonly sessionService: MemberSessionService,
    private readonly utilityService: UtilityService,
    @Inject(refreshJwtConfig.KEY)
    private readonly jwtRefreshConfig: ConfigType<typeof refreshJwtConfig>,
  ) {}

  async validateMember(email: string, password: string): Promise<MemberAuth> {
    const member = await this.memberService.findByEmail(email);

    if (!member) throw new UnauthorizedException('Invalid email or password');

    const passwordMatches = await UtilityService.verifyHashedValue(password, member.password);
    if (!passwordMatches) throw new UnauthorizedException('Invalid email or password');

    if (member.status === MemberStatusEnum.INACTIVE) {
      throw new UnauthorizedException('Your account is inactive. Contact admin.');
    }

    return { id: member.id, role: member.role };
  }

  async signup(dto: SignupDto): Promise<Member> {
    return this.memberService.signup(dto);
  }

  async login(user: MemberAuth): Promise<JwtResponse> {
    const tokens = await this.generateTokens(user.id, user.role);

    this.memberService.getById(user.id).then((member) => {
      const firstName = UtilityService.capitalizeFirstLetter(member.firstname);
      const loginTime = new Date().toLocaleString('en-GB', { timeZone: 'Africa/Lagos' });
      this.utilityService.sendEmailWithTemplate(
        member.email,
        `${firstName}, New Login Detected`,
        'login-notification',
        { name: firstName, loginTime },
      );
    }).catch(() => undefined);

    return tokens;
  }

  async refreshToken(user: MemberAuth): Promise<JwtResponse> {
    return this.generateTokens(user.id, user.role);
  }

  async logout(memberId: string): Promise<void> {
    await this.sessionService.updateLogout(memberId);
  }

  async validateRefreshToken(memberId: string, refreshToken: string): Promise<MemberAuth> {
    const hashed = await this.sessionService.getHashedRefreshToken(memberId);

    if (!hashed) throw new UnauthorizedException('Session not found');

    const isValid = await UtilityService.verifyHashedValue(refreshToken, hashed);
    if (!isValid) throw new UnauthorizedException('Invalid refresh token');

    const member = await this.memberService.getById(memberId);
    return { id: member.id, role: member.role };
  }

  async validateAccessToken(memberId: string): Promise<MemberAuth> {
    const hashed = await this.sessionService.getHashedRefreshToken(memberId);
    if (!hashed) throw new UnauthorizedException('Session expired. Please log in again.');

    const member = await this.memberService.getById(memberId);
    return { id: member.id, role: member.role };
  }

  async getProfile(memberId: string): Promise<Member> {
    return this.memberService.getById(memberId, [
      'workerProfile',
      'workerProfile.department',
    ]);
  }

  async changePassword(memberId: string, dto: ChangePasswordDto): Promise<string> {
    return this.memberService.changePassword(memberId, dto);
  }

  private async generateTokens(memberId: string, role: any): Promise<JwtResponse> {
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
