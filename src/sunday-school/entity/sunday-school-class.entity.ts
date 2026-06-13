import {Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn,} from 'typeorm';
import {Member} from '../../member/entity/member.entity';
import {BaseEntity} from '../../utility/entity/base.entity';

@Entity('sunday_school_classes')
export class SundaySchoolClass extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({nullable: true, type: 'text'})
    description: string | null;

    @ManyToOne(() => Member, {nullable: true, onDelete: 'SET NULL'})
    @JoinColumn({name: 'teacher_id'})
    teacher: Member | null;
}
