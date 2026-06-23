import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../utility/entity/base.entity';
import { PrayerDayMode } from '../enum/prayer.enum';

@Entity({ name: 'prayer_day_configs' })
export class PrayerDayConfig extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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
