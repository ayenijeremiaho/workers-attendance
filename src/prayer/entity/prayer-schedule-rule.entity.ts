import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../../utility/entity/base.entity';
import { PrayerRuleType } from '../enum/prayer.enum';
import { DepartmentLeadTypeEnum } from '../../department/enums/department-lead-type.enum';
import { PrayerProgram } from './prayer-program.entity';

@Entity({ name: 'prayer_schedule_rules' })
export class PrayerScheduleRule extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PrayerProgram, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'program_id' })
  program: PrayerProgram;

  @Column()
  type: PrayerRuleType;

  @Column({ nullable: true })
  targetLeadType: DepartmentLeadTypeEnum | null;

  @Column()
  value: number;

  @Column()
  description: string;

  @Column({ default: true })
  isActive: boolean;
}
