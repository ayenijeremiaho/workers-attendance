import {Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn} from 'typeorm';
import {BaseEntity} from '../../utility/entity/base.entity';
import {Event} from '../../event/entity/event.entity';
import {Member} from '../../member/entity/member.entity';
import {Admin} from '../../admin/entity/admin.entity';
import {FirstTimerSourceEnum} from '../enums/follow-up.enum';
import {FollowUpTask} from './follow-up-task.entity';

@Entity({name: 'first_timers'})
export class FirstTimer extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    firstname: string;

    @Column()
    lastname: string;

    @Column()
    phone: string;

    @Column({nullable: true})
    email: string | null;

    @Column({default: FirstTimerSourceEnum.WALK_IN})
    source: FirstTimerSourceEnum;

    @Column({default: false})
    wantsToJoinChurch: boolean;

    @Column({nullable: true, type: 'text'})
    enjoyedAboutChurch: string | null;

    @Column({default: false})
    wantsToJoinWorkforce: boolean;

    @Column({nullable: true, type: 'text'})
    notes: string | null;

    @ManyToOne(() => Event, {nullable: true, onDelete: 'SET NULL'})
    @JoinColumn({name: 'visited_event_id'})
    visitedEvent: Event | null;

    @ManyToOne(() => Member, {nullable: true, onDelete: 'SET NULL'})
    @JoinColumn({name: 'created_by_member_id'})
    createdByMember: Member | null;

    @ManyToOne(() => Admin, {nullable: true, onDelete: 'SET NULL'})
    @JoinColumn({name: 'created_by_admin_id'})
    createdByAdmin: Admin | null;

    @OneToOne(() => FollowUpTask, (task) => task.firstTimer)
    followUpTask: FollowUpTask;
}
