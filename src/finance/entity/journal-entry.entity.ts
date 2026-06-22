import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../../utility/entity/base.entity';
import {
  JournalEntrySource,
  JournalEntryStatus,
  JournalEntryType,
} from '../enum/finance.enum';
import { Admin } from '../../admin/entity/admin.entity';
import { AccountingPeriod } from './accounting-period.entity';
import { JournalEntryLine } from './journal-entry-line.entity';
import { JournalEntryLink } from './journal-entry-link.entity';

@Entity('finance_journal_entries')
export class JournalEntry extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', nullable: true })
  reference: string | null;

  @Column({ type: 'varchar', default: JournalEntrySource.MANUAL })
  source: JournalEntrySource;

  @Column({
    type: 'varchar',
    default: JournalEntryType.STANDARD,
    name: 'entry_type',
  })
  entryType: JournalEntryType;

  @Column({ type: 'varchar', default: JournalEntryStatus.DRAFT })
  status: JournalEntryStatus;

  @Column({ type: 'varchar', unique: true, name: 'idempotency_key' })
  idempotencyKey: string;

  @ManyToOne(() => AccountingPeriod, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'accounting_period_id' })
  accountingPeriod: AccountingPeriod;

  @ManyToOne(() => JournalEntry, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reversal_of_id' })
  reversalOf: JournalEntry | null;

  @ManyToOne(() => Admin, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: Admin;

  @ManyToOne(() => Admin, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approved_by_id' })
  approvedBy: Admin | null;

  @Column({ type: 'varchar', nullable: true, name: 'original_currency' })
  originalCurrency: string | null;

  @Column({
    type: 'numeric',
    precision: 15,
    scale: 6,
    nullable: true,
    name: 'exchange_rate',
  })
  exchangeRate: number | null;

  @Column({
    type: 'numeric',
    precision: 15,
    scale: 2,
    nullable: true,
    name: 'original_amount',
  })
  originalAmount: number | null;

  @OneToMany(() => JournalEntryLine, (line) => line.journalEntry, {
    cascade: true,
  })
  lines: JournalEntryLine[];

  @OneToMany(() => JournalEntryLink, (link) => link.journalEntry, {
    cascade: true,
  })
  links: JournalEntryLink[];
}
