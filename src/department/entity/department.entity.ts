import {Column, Entity, OneToMany, PrimaryGeneratedColumn,} from 'typeorm';
import {WorkerProfile} from '../../member/entity/worker-profile.entity';
import {DepartmentKeyEnum} from '../enums/department-key.enum';
import {BaseEntity} from '../../utility/entity/base.entity';

@Entity({name: 'departments'})
export class Department extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({unique: true})
    name: string;

    @Column()
    description: string;

    /**
     * Access category key. Multiple departments can share the same key, granting
     * workers in all of them access to features gated on that key.
     * e.g. "Technical Media" and "Social Media" can both carry key=MEDIA.
     * Null means no system-level access category is assigned.
     */
    @Column({nullable: true, default: null})
    key: DepartmentKeyEnum | null;

    @OneToMany(() => WorkerProfile, (profile) => profile.department)
    workerProfiles: WorkerProfile[];
}
