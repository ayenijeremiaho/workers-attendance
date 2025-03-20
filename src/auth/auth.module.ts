import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UtilityService } from '../utility/utility.service';
import { AdminLocalStrategy } from './strategy/admin.local.strategy';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import jwtConfig from '../config/jwt.config';
import { ConfigModule } from '@nestjs/config';
import { JwtStrategy } from './strategy/jwt.strategy';
import refreshJwtConfig from '../config/refresh.jwt.config';
import { RefreshJwtStrategy } from './strategy/refresh.jwt.strategy';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './guard/jwt-auth.guard';
import { Admin } from '../user/entity/admin.entity';
import { Worker } from '../user/entity/worker.entity';
import { UserSession } from '../user/entity/user-session.entity';
import { UserSessionService } from '../user/service/user-session.service';
import { AdminService } from '../user/service/admin.service';
import { WorkerService } from '../user/service/worker.service';
import { WorkerLocalStrategy } from './strategy/worker.local.strategy';
import { Department } from '../department/entity/department.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Admin, Department, Worker, UserSession]),
    JwtModule.registerAsync(jwtConfig.asProvider()),
    ConfigModule.forFeature(jwtConfig),
    ConfigModule.forFeature(refreshJwtConfig),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AdminService,
    WorkerService,
    UtilityService,
    AdminLocalStrategy,
    WorkerLocalStrategy,
    JwtStrategy,
    RefreshJwtStrategy,
    UserSessionService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AuthModule {}
