import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Member } from '../../member/entity/member.entity';
import { SundaySchoolSession } from './sunday-school-session.entity';
import { SundaySchoolAttendanceStatus } from '../enums/sunday-school-attendance-status.enum';
import { BaseEntity } from '../../utility/entity/base.entity';

@Entity('sunday_school_attendances')
@Unique(['session', 'member'])
export class SundaySchoolAttendance extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => SundaySchoolSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: SundaySchoolSession;

  @Index()
  @ManyToOne(() => Member, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @Column({
    type: 'enum',
    enum: SundaySchoolAttendanceStatus,
    enumName: 'ss_attendance_status',
  })
  status: SundaySchoolAttendanceStatus;

  @Column({ default: false })
  markedByTeacher: boolean;

  @Index()
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  markedAt: Date;
}
