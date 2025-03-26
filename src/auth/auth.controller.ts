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
import { UserTypeEnum } from '../user/enums/user-type.enum';
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
  @Roles(UserTypeEnum.ADMIN)
  @Post('/admin/login')
  async adminLogin(@Request() req: any): Promise<JwtResponse> {
    return this.authService.login(req.user, UserTypeEnum.ADMIN);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @UseGuards(RefreshJwtAuthGuard, RolesGuard)
  @Roles(UserTypeEnum.ADMIN)
  @Post('/admin/refresh')
  async adminRefresh(@Request() req: any): Promise<JwtResponse> {
    return this.authService.refreshToken(req.user, UserTypeEnum.ADMIN);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(UserTypeEnum.ADMIN)
  @Post('/admin/logout')
  async adminLogout(@Request() req: any): Promise<void> {
    await this.authService.logout(req.user, UserTypeEnum.ADMIN);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(UserTypeEnum.ADMIN)
  @Get('/admin/profile')
  async adminProfile(@Request() req: any): Promise<AdminDto> {
    const admin = await this.authService.getLoggedInUser(
      req.user,
      UserTypeEnum.ADMIN,
    );
    return plainToInstance(AdminDto, admin);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(UserTypeEnum.ADMIN)
  @Post('/admin/change-password')
  async changeAdminPassword(
    @Request() req: any,
    @Body() changePasswordDto: UserChangePasswordDto,
  ): Promise<string> {
    return this.authService.changeUserPassword(
      req.user,
      UserTypeEnum.ADMIN,
      changePasswordDto,
    );
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @UseGuards(WorkerLocalAuthGuard)
  @Post('/worker/login')
  async workerLogin(@Request() req: any): Promise<JwtResponse> {
    return this.authService.login(req.user, UserTypeEnum.WORKER);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(UserTypeEnum.WORKER)
  @Post('/worker/logout')
  async workerLogout(@Request() req: any): Promise<void> {
    await this.authService.logout(req.user, UserTypeEnum.WORKER);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(UserTypeEnum.WORKER)
  @Get('/worker/profile')
  async workerProfile(@Request() req: any): Promise<WorkerDto> {
    const worker = await this.authService.getLoggedInUser(
      req.user,
      UserTypeEnum.WORKER,
    );
    return plainToInstance(WorkerDto, worker);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(UserTypeEnum.WORKER)
  @Post('/worker/change-password')
  async changeWorkerPassword(
    @Request() req: any,
    @Body() changePasswordDto: UserChangePasswordDto,
  ): Promise<string> {
    return this.authService.changeUserPassword(
      req.user,
      UserTypeEnum.WORKER,
      changePasswordDto,
    );
  }
}
