import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../../utility/entity/base.entity';
import { Admin } from '../../admin/entity/admin.entity';
import { TitheAccount } from './tithe-account.entity';
import { TitheBatchStatus } from '../enum/tithe.enum';
import { TitheRow } from '../processor/tithe.processor';

@Entity({ name: 'tithe_upload_batches' })
export class TitheUploadBatch extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Admin, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'uploaded_by' })
  uploadedBy: Admin;

  @Index()
  @ManyToOne(() => TitheAccount, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tithe_account_id' })
  titheAccount: TitheAccount;

  @Column({ type: 'character varying' })
  fileName: string;

  @Column({ type: 'character varying', default: TitheBatchStatus.PENDING })
  status: TitheBatchStatus;

  @Column({ type: 'int', default: 0 })
  totalRows: number;

  @Column({ type: 'int', default: 0 })
  matchedRows: number;

  @Column({ type: 'int', default: 0 })
  unmatchedRows: number;

  @Column({ type: 'int', default: 0 })
  disputedRows: number;

  @Column({ type: 'jsonb', nullable: true })
  rows: TitheRow[] | null;

  @Column({ type: 'character varying', nullable: true })
  errorMessage: string;

  @Column({ type: 'timestamptz', nullable: true })
  processedAt: Date;
}
