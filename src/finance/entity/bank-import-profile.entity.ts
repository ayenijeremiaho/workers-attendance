import {Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm';
import {BaseEntity} from '../../utility/entity/base.entity';
import {AmountConvention} from '../enum/finance.enum';
import {Admin} from '../../admin/entity/admin.entity';

@Entity('finance_bank_import_profiles')
export class BankImportProfile extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({type: 'varchar'})
    name: string;

    @Column({type: 'boolean', default: false, name: 'is_default'})
    isDefault: boolean;

    @Column({type: 'varchar', default: ','})
    delimiter: string;

    @Column({type: 'int', default: 1, name: 'skip_header_rows'})
    skipHeaderRows: number;

    @Column({type: 'int', name: 'date_column_index'})
    dateColumnIndex: number;

    @Column({type: 'varchar', name: 'date_format'})
    dateFormat: string;

    @Column({type: 'varchar', nullable: true, name: 'date_column_name'})
    dateColumnName: string | null;

    @Column({type: 'int', name: 'narration_column_index'})
    narrationColumnIndex: number;

    @Column({type: 'varchar', nullable: true, name: 'narration_column_name'})
    narrationColumnName: string | null;

    @Column({type: 'varchar', name: 'amount_convention'})
    amountConvention: AmountConvention;

    @Column({type: 'int', nullable: true, name: 'amount_column_index'})
    amountColumnIndex: number | null;

    @Column({type: 'varchar', nullable: true, name: 'amount_column_name'})
    amountColumnName: string | null;

    @Column({type: 'int', nullable: true, name: 'type_column_index'})
    typeColumnIndex: number | null;

    @Column({type: 'varchar', nullable: true, name: 'type_column_name'})
    typeColumnName: string | null;

    @Column({type: 'varchar', nullable: true, name: 'debit_indicator'})
    debitIndicator: string | null;

    @Column({type: 'varchar', nullable: true, name: 'credit_indicator'})
    creditIndicator: string | null;

    @Column({type: 'int', nullable: true, name: 'debit_column_index'})
    debitColumnIndex: number | null;

    @Column({type: 'varchar', nullable: true, name: 'debit_column_name'})
    debitColumnName: string | null;

    @Column({type: 'int', nullable: true, name: 'credit_column_index'})
    creditColumnIndex: number | null;

    @Column({type: 'varchar', nullable: true, name: 'credit_column_name'})
    creditColumnName: string | null;

    @ManyToOne(() => Admin, {nullable: false, onDelete: 'RESTRICT'})
    @JoinColumn({name: 'created_by_id'})
    createdBy: Admin;
}
