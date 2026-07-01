import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../../utility/entity/base.entity';
import { PrayerDayMode } from '../enum/prayer.enum';
import { PrayerProgram } from './prayer-program.entity';

@Entity({ name: 'prayer_day_configs' })
export class PrayerDayConfig extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PrayerProgram, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'program_id' })
  program: PrayerProgram;

  @Column()
  dayOfWeek: number;

  @Column({ default: PrayerDayMode.VIRTUAL })
  mode: PrayerDayMode;

  @Column({ default: '00:00' })
  startTime: string;

  @Column({ default: '01:00' })
  endTime: string;

  @Column()
  maxCapacity: number;

  @Column({ default: true })
  isActive: boolean;
}
