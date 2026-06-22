import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../../utility/entity/base.entity';
import { Asset } from './asset.entity';
import { Admin } from '../../admin/entity/admin.entity';
import {
  AssetCondition,
  MaintenanceCompletionStatus,
  MaintenanceRecordType,
} from '../enum/asset.enum';

@Entity('asset_maintenance_records')
export class MaintenanceRecord extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Asset, (asset) => asset.maintenanceRecords, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'asset_id' })
  asset: Asset;

  @Column({ type: 'varchar' })
  type: MaintenanceRecordType;

  @Column({ type: 'date', name: 'performed_at' })
  performedAt: string;

  @Column({ type: 'varchar', name: 'performed_by' })
  performedBy: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  cost: number | null;

  @Column({ type: 'text' })
  notes: string;

  @Column({ type: 'simple-array', nullable: true })
  attachments: string[] | null;

  @Column({ type: 'varchar', name: 'condition_after' })
  conditionAfter: AssetCondition;

  @Column({ type: 'varchar', name: 'completion_status' })
  completionStatus: MaintenanceCompletionStatus;

  @ManyToOne(() => Admin, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'logged_by_id' })
  loggedBy: Admin;
}
