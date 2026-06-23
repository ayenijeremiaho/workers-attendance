import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../utility/entity/base.entity';

@Entity({ name: 'prayer_schedule_configs' })
export class PrayerScheduleConfig extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: 7 })
  selectionWindowDays: number;

  @Column({ default: true })
  isActive: boolean;
}
