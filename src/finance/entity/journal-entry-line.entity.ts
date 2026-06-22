import {Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm';
import {BaseEntity} from '../../utility/entity/base.entity';
import {JournalLineType} from '../enum/finance.enum';
import {JournalEntry} from './journal-entry.entity';
import {Account} from './account.entity';

@Entity('finance_journal_entry_lines')
export class JournalEntryLine extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => JournalEntry, entry => entry.lines, {nullable: false, onDelete: 'CASCADE'})
    @JoinColumn({name: 'journal_entry_id'})
    journalEntry: JournalEntry;

    @ManyToOne(() => Account, {nullable: false, onDelete: 'RESTRICT'})
    @JoinColumn({name: 'account_id'})
    account: Account;

    @Column({type: 'varchar', name: 'entry_type'})
    entryType: JournalLineType;

    @Column({type: 'numeric', precision: 15, scale: 2})
    amount: number;
}
