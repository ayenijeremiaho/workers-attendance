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
import { LocalAuthGuard } from '../guard/local-auth.guard';
import { RefreshJwtAuthGuard } from '../guard/refresh-jwt-auth.guard';
import { RolesGuard } from '../guard/roles.guard';
import { Roles } from '../decorator/roles.decorator';
import { MemberRoleEnum } from '../../member/enums/member-role.enum';
import { JwtResponse } from '../interface/auth.interface';
import { SignupDto } from '../../member/dto/signup.dto';
import { ChangePasswordDto } from '../../member/dto/change-password.dto';
import { plainToInstance } from 'class-transformer';
import { MemberDto } from '../../member/dto/member.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('signup')
  async signup(@Body() dto: SignupDto): Promise<MemberDto> {
    const member = await this.authService.signup(dto);
    return plainToInstance(MemberDto, member, { excludeExtraneousValues: true });
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req: any): Promise<JwtResponse> {
    return this.authService.login(req.user);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @UseGuards(RefreshJwtAuthGuard)
  @Post('refresh')
  async refresh(@Request() req: any): Promise<JwtResponse> {
    return this.authService.refreshToken(req.user);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(@Request() req: any): Promise<void> {
    await this.authService.logout(req.user.id);
  }

  @Get('me')
  async getProfile(@Request() req: any): Promise<MemberDto> {
    const member = await this.authService.getProfile(req.user.id);
    return plainToInstance(MemberDto, member, { excludeExtraneousValues: true });
  }

  @Post('change-password')
  async changePassword(
    @Request() req: any,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const message = await this.authService.changePassword(req.user.id, dto);
    return { message };
  }

  @UseGuards(RolesGuard)
  @Roles(MemberRoleEnum.ADMIN)
  @Get('admin/profile')
  async adminProfile(@Request() req: any): Promise<MemberDto> {
    const member = await this.authService.getProfile(req.user.id);
    return plainToInstance(MemberDto, member, { excludeExtraneousValues: true });
  }
}
