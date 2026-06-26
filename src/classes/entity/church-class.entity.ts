import {
  Column,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ChurchClassTypeEnum } from '../enum/church-class-type.enum';
import { ChurchClassStatusEnum } from '../enum/church-class-status.enum';
import { Member } from '../../member/entity/member.entity';
import { ClassEnrollment } from './class-enrollment.entity';
import { BaseEntity } from '../../utility/entity/base.entity';

@Entity('church_classes')
export class ChurchClass extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Index()
  @Column()
  type: ChurchClassTypeEnum;

  @Column({ nullable: true, type: 'text' })
  description: string | null;

  @Index()
  @Column({ default: ChurchClassStatusEnum.ACTIVE })
  status: ChurchClassStatusEnum;

  @ManyToOne(() => Member, { nullable: true, onDelete: 'SET NULL' })
  facilitator: Member | null;

  @Column({ type: 'date', nullable: true })
  startDate: string | null;

  @Column({ type: 'date', nullable: true })
  endDate: string | null;

  @OneToMany(() => ClassEnrollment, (enrollment) => enrollment.churchClass)
  enrollments: ClassEnrollment[];
}
