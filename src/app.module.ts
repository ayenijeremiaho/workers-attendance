import {Module} from '@nestjs/common';
import {ScheduleModule} from '@nestjs/schedule';
import {APP_GUARD} from '@nestjs/core';
import {MulterModule} from '@nestjs/platform-express';
import {AppController} from './app.controller';
import {AppService} from './app.service';
import {UtilityModule} from './utility/utility.module';
import {ConfigModule, ConfigService} from '@nestjs/config';
import {ThrottlerModule} from '@nestjs/throttler';
import {BullModule} from '@nestjs/bull';
import {AppThrottlerGuard} from './app-throttler.guard';
import dbConfig from './config/db.config';
import {envValidationSchema} from './config/env.validation';
import {TypeOrmModule} from '@nestjs/typeorm';
import {AuthModule} from './auth/auth.module';
import {LoggerModule} from 'nestjs-pino';
import {MemberModule} from './member/member.module';
import {DepartmentModule} from './department/department.module';
import {EventModule} from './event/event.module';
import {AttendanceModule} from './attendance/attendance.module';
import {DashboardModule} from './dashboard/dashboard.module';
import {RequestLeaveModule} from './request-leave/request-leave.module';
import {NotesModule} from './notes/notes.module';
import {ClassesModule} from './classes/classes.module';
import {AnnouncementModule} from './announcement/announcement.module';
import {VenueModule} from './venue/venue.module';
import {SundaySchoolModule} from './sunday-school/sunday-school.module';
import {ChildrenChurchModule} from './children-church/children-church.module';
import {BirthdayModule} from './birthday/birthday.module';
import {AdminModule} from './admin/admin.module';
import {EnumsModule} from './enums/enums.module';
import {TitheModule} from './tithe/tithe.module';
import {FinanceRequestModule} from './finance-request/finance-request.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            expandVariables: true,
            load: [dbConfig],
            validationSchema: envValidationSchema,
            validationOptions: {abortEarly: false},
        }),
        ThrottlerModule.forRootAsync({
            useFactory: (config: ConfigService) => [{
                ttl: config.get<number>('THROTTLE_TTL_MS', 60_000),
                limit: config.get<number>('THROTTLE_LIMIT', 100),
            }],
            inject: [ConfigService],
        }),
        LoggerModule.forRoot(),
        ScheduleModule.forRoot(),
        MulterModule.register({
            limits: {
                fileSize: Number.parseInt(process.env.MAX_FILE_UPLOAD_BYTES ?? '', 10) || 5 * 1024 * 1024,
            },
        }),
        BullModule.forRootAsync({
            useFactory: (config: ConfigService) => ({
                redis: {
                    host: config.get<string>('REDIS_HOST', 'localhost'),
                    port: config.get<number>('REDIS_PORT', 6379),
                    password: config.get<string>('REDIS_PASSWORD') || undefined,
                    db: config.get<number>('REDIS_DB', 0),
                },
            }),
            inject: [ConfigService],
        }),
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
        BirthdayModule,
        AdminModule,
        EnumsModule,
        TitheModule,
        FinanceRequestModule,
    ],
    controllers: [AppController],
    providers: [
        AppService,
        {provide: APP_GUARD, useClass: AppThrottlerGuard},
    ],
})
export class AppModule {
}
