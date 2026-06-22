import {Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm';
import {BaseEntity} from '../../utility/entity/base.entity';
import {PettyCashReplenishmentStatus} from '../enum/finance.enum';
import {Account} from './account.entity';
import {Admin} from '../../admin/entity/admin.entity';

@Entity('finance_petty_cash_replenishments')
export class PettyCashReplenishment extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Account, {nullable: false, onDelete: 'RESTRICT'})
    @JoinColumn({name: 'from_account_id'})
    fromAccount: Account;

    @ManyToOne(() => Account, {nullable: false, onDelete: 'RESTRICT'})
    @JoinColumn({name: 'to_cash_account_id'})
    toCashAccount: Account;

    @Column({type: 'numeric', precision: 15, scale: 2})
    amount: number;

    @Column({type: 'varchar', default: PettyCashReplenishmentStatus.PENDING})
    status: PettyCashReplenishmentStatus;

    @Column({type: 'text', nullable: true})
    notes: string | null;

    @ManyToOne(() => Admin, {nullable: false, onDelete: 'RESTRICT'})
    @JoinColumn({name: 'requested_by_id'})
    requestedBy: Admin;

    @ManyToOne(() => Admin, {nullable: true, onDelete: 'SET NULL'})
    @JoinColumn({name: 'approved_by_id'})
    approvedBy: Admin | null;

    @Column({type: 'timestamptz', nullable: true, name: 'approved_at'})
    approvedAt: Date | null;
}
