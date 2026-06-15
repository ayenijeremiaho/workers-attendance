import {Module} from '@nestjs/common';
import {DashboardService} from './service/dashboard.service';
import {DashboardController} from './controller/dashboard.controller';
import {MemberModule} from '../member/member.module';
import {AttendanceModule} from '../attendance/attendance.module';
import {EventModule} from '../event/event.module';
import {DepartmentModule} from '../department/department.module';
import {RequestLeaveModule} from '../request-leave/request-leave.module';
import {ClassesModule} from '../classes/classes.module';
import {UtilityModule} from '../utility/utility.module';

@Module({
    imports: [
        MemberModule,
        AttendanceModule,
        EventModule,
        DepartmentModule,
        RequestLeaveModule,
        ClassesModule,
        UtilityModule,
    ],
    providers: [DashboardService],
    controllers: [DashboardController],
})
export class DashboardModule {
}
