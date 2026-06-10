import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { EnrollmentStatusEnum } from '../enum/enrollment-status.enum';
import { Member } from '../../member/entity/member.entity';
import { ChurchClass } from './church-class.entity';

@Entity('class_enrollments')
@Unique(['member', 'churchClass'])
export class ClassEnrollment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Member, { onDelete: 'CASCADE' })
  member: Member;

  @Index()
  @ManyToOne(() => ChurchClass, { onDelete: 'CASCADE' })
  churchClass: ChurchClass;

  @Column({ type: 'enum', enum: EnrollmentStatusEnum, default: EnrollmentStatusEnum.IN_PROGRESS })
  status: EnrollmentStatusEnum;

  @CreateDateColumn()
  enrolledAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  @UpdateDateColumn()
  updatedAt: Date;
}
