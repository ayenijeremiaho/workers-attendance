import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UtilityModule } from './utility/utility.module';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './user/user.module';
import dbConfig from './config/db.config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { LoggerModule } from 'nestjs-pino';
import { DepartmentModule } from './department/department.module';
import { EventModule } from './event/event.module';
import { AttendanceModule } from './attendance/attendance.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { RequestLeaveService } from './request-leave/service/request-leave.service';
import { RequestLeaveModule } from './request-leave/request-leave.module';
import { NotesModule } from './notes/notes.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
      load: [dbConfig],
    }),
    LoggerModule.forRoot(),
    TypeOrmModule.forRootAsync({
      useFactory: dbConfig,
    }),
    AuthModule,
    UtilityModule,
    UserModule,
    DepartmentModule,
    EventModule,
    AttendanceModule,
    DashboardModule,
    RequestLeaveModule,
    NotesModule,
  ],
  controllers: [AppController],
  providers: [AppService, RequestLeaveService],
})
export class AppModule {}
