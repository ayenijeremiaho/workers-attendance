import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../utility/entity/base.entity';
import { PrayerRuleType } from '../enum/prayer.enum';
import { DepartmentLeadTypeEnum } from '../../department/enums/department-lead-type.enum';

@Entity({ name: 'prayer_schedule_rules' })
export class PrayerScheduleRule extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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
