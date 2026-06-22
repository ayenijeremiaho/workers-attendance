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
import { SundaySchoolClass } from './sunday-school-class.entity';
import { BaseEntity } from '../../utility/entity/base.entity';

@Entity('sunday_school_members')
@Unique(['member', 'sundaySchoolClass'])
export class SundaySchoolMember extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => Member, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @Index()
  @ManyToOne(() => SundaySchoolClass, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sunday_school_class_id' })
  sundaySchoolClass: SundaySchoolClass;

  @Index()
  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  assignedAt: Date;
}
