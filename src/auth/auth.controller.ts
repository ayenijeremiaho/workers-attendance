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
import { AuthService } from './auth.service';
import { AdminLocalAuthGuard } from './guard/admin-local-auth.guard';
import { JwtResponse } from './interface/auth.interface';
import { RefreshJwtAuthGuard } from './guard/refresh-jwt-auth.guard';
import { Public } from './decorator/public.decorator';
import { UserType } from '../user/enums/user-type';
import { WorkerLocalAuthGuard } from './guard/worker-local-auth.guard';
import { Roles } from './decorator/roles.decorator';
import { RolesGuard } from './guard/roles.guard';
import { plainToInstance } from 'class-transformer';
import { WorkerDto } from '../user/dto/worker.dto';
import { AdminDto } from '../user/dto/admin.dto';
import { UserChangePasswordDto } from '../user/dto/user-change-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminLocalAuthGuard)
  @Roles(UserType.ADMIN)
  @Post('/admin/login')
  async adminLogin(@Request() req: any): Promise<JwtResponse> {
    return this.authService.login(req.user, UserType.ADMIN);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @UseGuards(RefreshJwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  @Post('/admin/refresh')
  async adminRefresh(@Request() req: any): Promise<JwtResponse> {
    return this.authService.refreshToken(req.user, UserType.ADMIN);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  @Post('/admin/logout')
  async adminLogout(@Request() req: any): Promise<void> {
    await this.authService.logout(req.user, UserType.ADMIN);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  @Get('/admin/profile')
  async adminProfile(@Request() req: any): Promise<AdminDto> {
    const admin = await this.authService.getLoggedInUser(
      req.user,
      UserType.ADMIN,
    );
    return plainToInstance(AdminDto, admin);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  @Post('/admin/change-password')
  async changeAdminPassword(
    @Request() req: any,
    @Body() changePasswordDto: UserChangePasswordDto,
  ): Promise<string> {
    return this.authService.changeUserPassword(
      req.user,
      UserType.ADMIN,
      changePasswordDto,
    );
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @UseGuards(WorkerLocalAuthGuard)
  @Post('/worker/login')
  async workerLogin(@Request() req: any): Promise<JwtResponse> {
    return this.authService.login(req.user, UserType.WORKER);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(UserType.WORKER)
  @Post('/worker/logout')
  async workerLogout(@Request() req: any): Promise<void> {
    await this.authService.logout(req.user, UserType.WORKER);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(UserType.WORKER)
  @Get('/worker/profile')
  async workerProfile(@Request() req: any): Promise<WorkerDto> {
    const worker = await this.authService.getLoggedInUser(
      req.user,
      UserType.WORKER,
    );
    return plainToInstance(WorkerDto, worker);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(UserType.WORKER)
  @Post('/worker/change-password')
  async changeWorkerPassword(
    @Request() req: any,
    @Body() changePasswordDto: UserChangePasswordDto,
  ): Promise<string> {
    return this.authService.changeUserPassword(
      req.user,
      UserType.WORKER,
      changePasswordDto,
    );
  }
}
