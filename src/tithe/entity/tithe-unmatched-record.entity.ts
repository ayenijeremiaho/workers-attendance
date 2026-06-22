import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../../utility/entity/base.entity';
import { TitheUploadBatch } from './tithe-upload-batch.entity';
import { Member } from '../../member/entity/member.entity';
import { Admin } from '../../admin/entity/admin.entity';
import { TitheUnmatchedStatus } from '../enum/tithe.enum';

@Entity({ name: 'tithe_unmatched_records' })
export class TitheUnmatchedRecord extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => TitheUploadBatch, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'batch_id' })
  batch: TitheUploadBatch;

  @Column({ type: 'character varying' })
  rawEmail: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'date' })
  paymentDate: string;

  @Column({ type: 'character varying', nullable: true })
  reference: string;

  @Column({ type: 'character varying', nullable: true })
  bankName: string;

  @Column({ type: 'character varying', default: TitheUnmatchedStatus.PENDING })
  status: TitheUnmatchedStatus;

  @ManyToOne(() => Member, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'matched_member_id' })
  matchedMember: Member;

  @ManyToOne(() => Admin, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'resolved_by' })
  resolvedBy: Admin;

  @Column({ type: 'timestamptz', nullable: true })
  resolvedAt: Date;
}
