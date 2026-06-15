import {Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn,} from 'typeorm';
import {BaseEntity} from '../../utility/entity/base.entity';
import {ServiceSession} from './service-session.entity';
import {ServiceProgrammeSlot} from './service-programme-slot.entity';
import {Member} from '../../member/entity/member.entity';
import {ServiceSessionSlotStatusEnum} from '../enum/service-session-slot-status.enum';

@Entity({name: 'service_session_slots'})
export class ServiceSessionSlot extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @ManyToOne(() => ServiceSession, (session) => session.sessionSlots, {onDelete: 'CASCADE'})
    @JoinColumn({name: 'session_id'})
    session: ServiceSession;

    @ManyToOne(() => ServiceProgrammeSlot, {onDelete: 'CASCADE'})
    @JoinColumn({name: 'programme_slot_id'})
    programmeSlot: ServiceProgrammeSlot;

    @Column({type: 'int'})
    position: number;

    @Column({default: ServiceSessionSlotStatusEnum.PENDING})
    status: ServiceSessionSlotStatusEnum;

    @Column({name: 'adjusted_allocated_minutes', type: 'int', nullable: true})
    adjustedAllocatedMinutes: number | null;

    @Column({name: 'overridden_topic', nullable: true})
    overriddenTopic: string | null;

    @Column({name: 'overridden_speaker_name', nullable: true})
    overriddenSpeakerName: string | null;

    @ManyToOne(() => Member, {nullable: true, onDelete: 'SET NULL'})
    @JoinColumn({name: 'overridden_member_id'})
    overriddenMember: Member | null;

    @Column({name: 'actual_seconds', type: 'int', nullable: true})
    actualSeconds: number | null;

    @Column({name: 'started_at', type: 'timestamptz', nullable: true})
    startedAt: Date | null;

    @Column({name: 'completed_at', type: 'timestamptz', nullable: true})
    completedAt: Date | null;
}
