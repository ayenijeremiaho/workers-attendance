import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { BaseEntity } from '../../utility/entity/base.entity';
import { WorkerProfile } from '../../member/entity/worker-profile.entity';
import { PrayerDayConfig } from './prayer-day-config.entity';

@Entity({ name: 'prayer_fixed_assignments' })
@Unique(['workerProfile', 'dayConfig'])
export class PrayerFixedAssignment extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => WorkerProfile, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'worker_profile_id' })
  workerProfile: WorkerProfile;

  @ManyToOne(() => PrayerDayConfig, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'day_config_id' })
  dayConfig: PrayerDayConfig;

  @Column({ default: true })
  isActive: boolean;
}
