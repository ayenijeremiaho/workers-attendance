import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from '../service/auth.service';
import { Public } from '../decorator/public.decorator';
import { SkipPasswordChangeCheck } from '../decorator/skip-password-change-check.decorator';
import { LocalAuthGuard } from '../guard/local-auth.guard';
import { RefreshJwtAuthGuard } from '../guard/refresh-jwt-auth.guard';
import { JwtResponse } from '../interface/auth.interface';
import { SignupDto } from '../../member/dto/signup.dto';
import { ChangePasswordDto } from '../../member/dto/change-password.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import {
  RequestDeviceResetDto,
  VerifyDeviceResetDto,
} from '../dto/device-reset.dto';
import { plainToInstance } from 'class-transformer';
import { MemberDto } from '../../member/dto/member.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('signup')
  async signup(@Body() dto: SignupDto): Promise<MemberDto> {
    const member = await this.authService.signup(dto);
    return plainToInstance(MemberDto, member, {
      excludeExtraneousValues: true,
    });
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(
    @Request() req: any,
    @Body('deviceId') deviceId: string,
  ): Promise<JwtResponse> {
    return this.authService.login(req.user, deviceId);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard)
  @Post('admin-login')
  async adminLogin(@Request() req: any): Promise<JwtResponse> {
    return this.authService.adminLogin(req.user);
  }

  @SkipPasswordChangeCheck()
  @Public()
  @HttpCode(HttpStatus.OK)
  @UseGuards(RefreshJwtAuthGuard)
  @Post('refresh')
  async refresh(@Request() req: any): Promise<JwtResponse> {
    return this.authService.refreshToken(req.user);
  }

  @SkipPasswordChangeCheck()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(@Request() req: any): Promise<void> {
    await this.authService.logout(req.user.id, req.user.surface);
  }

  @SkipPasswordChangeCheck()
  @Get('me')
  async getProfile(@Request() req: any): Promise<MemberDto> {
    const member = await this.authService.getProfile(req.user.id);
    return plainToInstance(MemberDto, member, {
      excludeExtraneousValues: true,
    });
  }

  @SkipPasswordChangeCheck()
  @Post('change-password')
  async changePassword(
    @Request() req: any,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const message = await this.authService.changePassword(req.user.id, dto);
    return { message };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    await this.authService.forgotPassword(dto.email);
    return {
      message:
        'If an account exists for this email, a reset code has been sent.',
    };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    await this.authService.resetPassword(dto);
    return { message: 'Password reset successfully. You can now log in.' };
  }

  @Public()
  @SkipPasswordChangeCheck()
  @HttpCode(HttpStatus.OK)
  @Post('device-reset/request')
  async requestDeviceReset(
    @Body() dto: RequestDeviceResetDto,
  ): Promise<{ message: string }> {
    await this.authService.requestDeviceReset(dto.email, dto.newDeviceId);
    return {
      message:
        'If an account exists for this email, a device reset code has been sent.',
    };
  }

  @Public()
  @SkipPasswordChangeCheck()
  @HttpCode(HttpStatus.OK)
  @Post('device-reset/verify')
  async verifyDeviceReset(
    @Body() dto: VerifyDeviceResetDto,
  ): Promise<{ message: string }> {
    await this.authService.verifyDeviceReset(dto.email, dto.otp);
    return {
      message:
        'Device updated successfully. You can now log in from your new device.',
    };
  }
}
