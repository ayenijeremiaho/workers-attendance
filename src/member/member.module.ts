import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Member } from './entity/member.entity';
import { WorkerProfile } from './entity/worker-profile.entity';
import { MemberSession } from './entity/member-session.entity';
import { MemberService } from './service/member.service';
import { MemberSessionService } from './service/member-session.service';
import { MemberController } from './controller/member.controller';
import { Department } from '../department/entity/department.entity';
import { DepartmentLead } from '../department/entity/department-lead.entity';
import { SundaySchoolClass } from '../sunday-school/entity/sunday-school-class.entity';
import { UtilityModule } from '../utility/utility.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Member,
      WorkerProfile,
      MemberSession,
      Department,
      DepartmentLead,
      SundaySchoolClass,
    ]),
    UtilityModule,
  ],
  controllers: [MemberController],
  providers: [MemberService, MemberSessionService],
  exports: [MemberService, MemberSessionService, TypeOrmModule],
})
export class MemberModule {}
