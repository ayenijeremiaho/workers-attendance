import {Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm';
import {BaseEntity} from '../../utility/entity/base.entity';
import {Fund} from './fund.entity';
import {Admin} from '../../admin/entity/admin.entity';

@Entity('finance_pledge_campaigns')
export class PledgeCampaign extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({type: 'varchar'})
    name: string;

    @ManyToOne(() => Fund, {nullable: false, onDelete: 'RESTRICT'})
    @JoinColumn({name: 'fund_id'})
    fund: Fund;

    @Column({type: 'numeric', precision: 15, scale: 2, name: 'target_amount'})
    targetAmount: number;

    @Column({type: 'date', name: 'start_date'})
    startDate: string;

    @Column({type: 'date', name: 'end_date'})
    endDate: string;

    @Column({type: 'text', nullable: true})
    description: string | null;

    @Column({type: 'boolean', default: true, name: 'is_active'})
    isActive: boolean;

    @ManyToOne(() => Admin, {nullable: false, onDelete: 'RESTRICT'})
    @JoinColumn({name: 'created_by_id'})
    createdBy: Admin;
}
