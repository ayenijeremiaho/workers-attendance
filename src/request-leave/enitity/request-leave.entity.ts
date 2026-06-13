import {Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn,} from 'typeorm';
import {WorkerProfile} from '../../member/entity/worker-profile.entity';
import {Member} from '../../member/entity/member.entity';
import {LeaveStatusEnum} from '../enums/leave-status.enum';
import {BaseEntity} from '../../utility/entity/base.entity';

@Entity({name: 'request_leave'})
export class RequestLeave extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @ManyToOne(() => WorkerProfile, (profile) => profile.leaveRequests, {onDelete: 'CASCADE'})
    @JoinColumn({name: 'worker_profile_id'})
    workerProfile: WorkerProfile;

    @Index()
    @Column({type: 'timestamptz'})
    dateFrom: Date;

    @Index()
    @Column({type: 'timestamptz'})
    dateTo: Date;

    @Column({type: 'varchar', length: 500})
    reason: string;

    @Index()
    @Column({default: LeaveStatusEnum.PENDING})
    status: LeaveStatusEnum;

    @ManyToOne(() => Member, {nullable: true, onDelete: 'SET NULL'})
    @JoinColumn({name: 'actioned_by'})
    actionedBy: Member;
}
