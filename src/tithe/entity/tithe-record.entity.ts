import {Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm';
import {BaseEntity} from '../../utility/entity/base.entity';
import {Member} from '../../member/entity/member.entity';
import {TitheUploadBatch} from './tithe-upload-batch.entity';

@Entity({name: 'tithe_records'})
export class TitheRecord extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @ManyToOne(() => Member, {nullable: false, onDelete: 'RESTRICT'})
    @JoinColumn({name: 'member_id'})
    member: Member;

    @ManyToOne(() => TitheUploadBatch, {nullable: false, onDelete: 'RESTRICT'})
    @JoinColumn({name: 'batch_id'})
    batch: TitheUploadBatch;

    @Column({type: 'numeric', precision: 12, scale: 2})
    amount: number;

    @Column({type: 'date'})
    paymentDate: string;

    @Column({type: 'character varying', nullable: true})
    reference: string;

    @Column({type: 'character varying', nullable: true})
    bankName: string;
}
