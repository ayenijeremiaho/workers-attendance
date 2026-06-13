import {Column, Entity, PrimaryGeneratedColumn} from 'typeorm';
import {BaseEntity} from '../../utility/entity/base.entity';

@Entity({name: 'finance_categories'})
export class FinanceCategory extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({type: 'character varying', unique: true})
    name: string;

    @Column({type: 'character varying', nullable: true})
    description: string;
}
