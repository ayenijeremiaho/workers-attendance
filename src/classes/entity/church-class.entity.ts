import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ChurchClassTypeEnum } from '../enum/church-class-type.enum';
import { Member } from '../../member/entity/member.entity';

@Entity('church_classes')
export class ChurchClass {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Index()
  @Column({ type: 'enum', enum: ChurchClassTypeEnum })
  type: ChurchClassTypeEnum;

  @Column({ nullable: true, type: 'text' })
  description: string | null;

  @ManyToOne(() => Member, { nullable: true, onDelete: 'SET NULL' })
  facilitator: Member | null;

  @Column({ type: 'date', nullable: true })
  startDate: string | null;

  @Column({ type: 'date', nullable: true })
  endDate: string | null;

  @OneToMany('ClassEnrollment', 'churchClass')
  enrollments: any[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
