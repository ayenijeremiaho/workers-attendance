import {Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';
import {BaseEntity} from '../../utility/entity/base.entity';
import {CurrencyCode} from '../enum/tithe.enum';

@Entity({name: 'tithe_accounts'})
export class TitheAccount extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({type: 'character varying'})
    bankName: string;

    @Index()
    @Column({type: 'character varying'})
    accountNumber: string;

    @Column({type: 'character varying'})
    accountName: string;

    @Index()
    @Column({type: 'character varying'})
    currency: CurrencyCode;

    @Column({type: 'character varying', nullable: true})
    description: string;

    @Index()
    @Column({type: 'boolean', default: true})
    isActive: boolean;
}
