import {Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm';
import {BaseEntity} from '../../utility/entity/base.entity';
import {VirtualAccountProvider} from '../enum/finance.enum';
import {Member} from '../../member/entity/member.entity';
import {Admin} from '../../admin/entity/admin.entity';

@Entity('member_virtual_accounts')
export class MemberVirtualAccount extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Member, {nullable: false, onDelete: 'RESTRICT'})
    @JoinColumn({name: 'member_id'})
    member: Member;

    @Column({type: 'varchar'})
    provider: VirtualAccountProvider;

    @Column({type: 'varchar', name: 'bank_name'})
    bankName: string;

    @Column({type: 'varchar', name: 'account_number'})
    accountNumber: string;

    @Column({type: 'varchar', name: 'account_name'})
    accountName: string;

    @Column({type: 'varchar', unique: true, name: 'provider_ref'})
    providerRef: string;

    @Column({type: 'boolean', default: true, name: 'is_active'})
    isActive: boolean;

    @ManyToOne(() => Admin, {nullable: true, onDelete: 'SET NULL'})
    @JoinColumn({name: 'deactivated_by_id'})
    deactivatedBy: Admin | null;

    @Column({type: 'timestamptz', nullable: true, name: 'deactivated_at'})
    deactivatedAt: Date | null;
}
