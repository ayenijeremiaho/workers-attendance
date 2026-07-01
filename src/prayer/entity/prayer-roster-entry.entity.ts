import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../../utility/entity/base.entity';
import { WorkerProfile } from '../../member/entity/worker-profile.entity';
import { Member } from '../../member/entity/member.entity';
import { PrayerMeeting } from './prayer-meeting.entity';
import { PrayerAssignmentType, PrayerRosterStatus } from '../enum/prayer.enum';

@Entity({ name: 'prayer_roster_entries' })
export class PrayerRosterEntry extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => WorkerProfile, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'worker_profile_id' })
  workerProfile: WorkerProfile | null;

  @Index()
  @ManyToOne(() => Member, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'member_id' })
  member: Member | null;

  @Index()
  @ManyToOne(() => PrayerMeeting, (meeting) => meeting.rosterEntries, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'meeting_id' })
  meeting: PrayerMeeting;

  @Column()
  assignmentType: PrayerAssignmentType;

  @Column({ default: PrayerRosterStatus.SCHEDULED })
  status: PrayerRosterStatus;

  @ManyToOne(() => PrayerRosterEntry, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'rescheduled_from_id' })
  rescheduledFrom: PrayerRosterEntry | null;

  @Column({ default: false })
  reminderTwoDaySent: boolean;

  @Column({ default: false })
  reminderDaySent: boolean;
}
