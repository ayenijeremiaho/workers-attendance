import {Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm';
import {BaseEntity} from '../../utility/entity/base.entity';
import {RecurringFrequency} from '../enum/finance.enum';
import {Account} from './account.entity';
import {Fund} from './fund.entity';
import {Admin} from '../../admin/entity/admin.entity';

@Entity('finance_recurring_entries')
export class RecurringEntry extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({type: 'varchar'})
    description: string;

    @ManyToOne(() => Account, {nullable: false, onDelete: 'RESTRICT'})
    @JoinColumn({name: 'debit_account_id'})
    debitAccount: Account;

    @ManyToOne(() => Account, {nullable: false, onDelete: 'RESTRICT'})
    @JoinColumn({name: 'credit_account_id'})
    creditAccount: Account;

    @Column({type: 'numeric', precision: 15, scale: 2})
    amount: number;

    @Column({type: 'varchar'})
    frequency: RecurringFrequency;

    @ManyToOne(() => Fund, {nullable: false, onDelete: 'RESTRICT'})
    @JoinColumn({name: 'fund_id'})
    fund: Fund;

    @Column({type: 'timestamptz', name: 'next_due_at'})
    nextDueAt: Date;

    @Column({type: 'timestamptz', nullable: true, name: 'last_generated_at'})
    lastGeneratedAt: Date | null;

    @Column({type: 'boolean', default: true, name: 'is_active'})
    isActive: boolean;

    @ManyToOne(() => Admin, {nullable: false, onDelete: 'RESTRICT'})
    @JoinColumn({name: 'created_by_id'})
    createdBy: Admin;
}
