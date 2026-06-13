import {Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique,} from 'typeorm';
import {SundaySchoolClass} from './sunday-school-class.entity';
import {BaseEntity} from '../../utility/entity/base.entity';

@Entity('sunday_school_sessions')
@Unique(['sundaySchoolClass', 'sessionDate'])
export class SundaySchoolSession extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @ManyToOne(() => SundaySchoolClass, {onDelete: 'CASCADE'})
    @JoinColumn({name: 'sunday_school_class_id'})
    sundaySchoolClass: SundaySchoolClass;

    @Index()
    @Column({type: 'date'})
    sessionDate: string;

    @Column({default: false})
    selfMarkOpen: boolean;

    @Column({nullable: true, type: 'text'})
    notes: string | null;
}
