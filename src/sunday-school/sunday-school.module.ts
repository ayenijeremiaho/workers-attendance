import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SundaySchoolClass } from './entity/sunday-school-class.entity';
import { SundaySchoolMember } from './entity/sunday-school-member.entity';
import { SundaySchoolSession } from './entity/sunday-school-session.entity';
import { SundaySchoolAttendance } from './entity/sunday-school-attendance.entity';
import { SundaySchoolService } from './service/sunday-school.service';
import { SundaySchoolController } from './controller/sunday-school.controller';
import { MemberModule } from '../member/member.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SundaySchoolClass,
      SundaySchoolMember,
      SundaySchoolSession,
      SundaySchoolAttendance,
    ]),
    MemberModule,
  ],
  controllers: [SundaySchoolController],
  providers: [SundaySchoolService],
  exports: [SundaySchoolService],
})
export class SundaySchoolModule {}
