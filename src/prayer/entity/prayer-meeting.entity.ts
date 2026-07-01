import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../../utility/entity/base.entity';
import { PrayerDayConfig } from './prayer-day-config.entity';
import { PrayerProgram } from './prayer-program.entity';
import { PrayerMeetingStatus, PrayerWindowStatus } from '../enum/prayer.enum';
import { PrayerRosterEntry } from './prayer-roster-entry.entity';

@Entity({ name: 'prayer_meetings' })
export class PrayerMeeting extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => PrayerProgram, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'program_id' })
  program: PrayerProgram;

  @Index()
  @Column({ type: 'date' })
  date: string;

  @Index()
  @Column()
  month: number;

  @Index()
  @Column()
  year: number;

  @ManyToOne(() => PrayerDayConfig, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'day_config_id' })
  dayConfig: PrayerDayConfig;

  @Column({ default: PrayerMeetingStatus.SCHEDULED })
  status: PrayerMeetingStatus;

  @Column({ default: PrayerWindowStatus.PENDING })
  selectionStatus: PrayerWindowStatus;

  @Column({ default: 0 })
  currentCapacity: number;

  @OneToMany(() => PrayerRosterEntry, (entry) => entry.meeting)
  rosterEntries: PrayerRosterEntry[];
}
