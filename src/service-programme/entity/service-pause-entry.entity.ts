import {Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn,} from 'typeorm';
import {BaseEntity} from '../../utility/entity/base.entity';
import {ServiceSession} from './service-session.entity';
import {ServicePauseReasonEnum} from '../enum/service-pause-reason.enum';

@Entity({name: 'service_pause_entries'})
export class ServicePauseEntry extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @ManyToOne(() => ServiceSession, (session) => session.pauseEntries, {onDelete: 'CASCADE'})
    @JoinColumn({name: 'session_id'})
    session: ServiceSession;

    @Column({name: 'slot_position', type: 'int'})
    slotPosition: number;

    @Column()
    reason: ServicePauseReasonEnum;

    @Column({name: 'paused_at', type: 'timestamptz'})
    pausedAt: Date;

    @Column({name: 'resumed_at', type: 'timestamptz', nullable: true})
    resumedAt: Date | null;
}
