import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../utility/entity/base.entity';
import { PrayerAudience } from '../enum/prayer.enum';

@Entity({ name: 'prayer_programs' })
export class PrayerProgram extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true, type: 'text' })
  description: string | null;

  @Column({ default: PrayerAudience.WORKERS })
  audience: PrayerAudience;

  @Column({ default: 7 })
  selectionWindowDays: number;

  @Column({ default: true })
  isActive: boolean;
}
