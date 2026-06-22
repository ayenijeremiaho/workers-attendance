import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../../utility/entity/base.entity';
import { TitheUploadBatch } from './tithe-upload-batch.entity';
import { TitheRecord } from './tithe-record.entity';
import { Admin } from '../../admin/entity/admin.entity';
import { TitheDisputeStatus } from '../enum/tithe.enum';
import { Member } from '../../member/entity/member.entity';

@Entity({ name: 'tithe_dispute_records' })
export class TitheDisputeRecord extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => TitheUploadBatch, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'batch_id' })
  batch: TitheUploadBatch;

  @ManyToOne(() => TitheRecord, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'existing_record_id' })
  existingRecord: TitheRecord;

  @ManyToOne(() => Member, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'date' })
  paymentDate: string;

  @Column({ type: 'character varying', nullable: true })
  reference: string;

  @Column({ type: 'character varying', nullable: true })
  bankName: string;

  @Column({ type: 'character varying', default: TitheDisputeStatus.PENDING })
  status: TitheDisputeStatus;

  @ManyToOne(() => Admin, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewed_by' })
  reviewedBy: Admin;

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt: Date;
}
