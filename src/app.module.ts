import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UtilityModule } from './utility/utility.module';
import { ConfigModule } from '@nestjs/config';
import dbConfig from './config/db.config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { LoggerModule } from 'nestjs-pino';
import { MemberModule } from './member/member.module';
import { DepartmentModule } from './department/department.module';
import { EventModule } from './event/event.module';
import { AttendanceModule } from './attendance/attendance.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { RequestLeaveModule } from './request-leave/request-leave.module';
import { NotesModule } from './notes/notes.module';
import { ClassesModule } from './classes/classes.module';
import { AnnouncementModule } from './announcement/announcement.module';
import { VenueModule } from './venue/venue.module';
import { SundaySchoolModule } from './sunday-school/sunday-school.module';
import { ChildrenChurchModule } from './children-church/children-church.module';

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
    MemberModule,
    DepartmentModule,
    EventModule,
    AttendanceModule,
    DashboardModule,
    RequestLeaveModule,
    NotesModule,
    ClassesModule,
    AnnouncementModule,
    VenueModule,
    SundaySchoolModule,
    ChildrenChurchModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
