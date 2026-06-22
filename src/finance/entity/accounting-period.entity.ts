import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../../utility/entity/base.entity';
import { AccountingPeriodStatus } from '../enum/finance.enum';
import { Admin } from '../../admin/entity/admin.entity';

@Entity('finance_accounting_periods')
export class AccountingPeriod extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'int' })
  month: number;

  @Column({ type: 'varchar', default: AccountingPeriodStatus.OPEN })
  status: AccountingPeriodStatus;

  @Column({ type: 'timestamptz', nullable: true, name: 'closed_at' })
  closedAt: Date | null;

  @ManyToOne(() => Admin, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'closed_by_id' })
  closedBy: Admin | null;
}
