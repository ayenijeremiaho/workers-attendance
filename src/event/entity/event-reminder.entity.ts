import {Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique} from 'typeorm';
import {BaseEntity} from '../../utility/entity/base.entity';
import {ServiceSlot} from './service-slot.entity';
import {Department} from '../../department/entity/department.entity';
import {AnnouncementAudienceEnum} from '../../announcement/enum/announcement-audience.enum';
import {ReminderIntervalPresetEnum} from '../enum/reminder-interval-preset.enum';

@Unique(['serviceSlot', 'intervalPreset'])
@Entity('event_reminders')
export class EventReminder extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @ManyToOne(() => ServiceSlot, {onDelete: 'CASCADE'})
    @JoinColumn({name: 'service_slot_id'})
    serviceSlot: ServiceSlot;

    @Column({default: AnnouncementAudienceEnum.ALL})
    audience: AnnouncementAudienceEnum;

    @ManyToOne(() => Department, {nullable: true, onDelete: 'SET NULL'})
    @JoinColumn({name: 'department_id'})
    department: Department | null;

    @Column()
    intervalPreset: ReminderIntervalPresetEnum;

    @Column({default: true})
    enabled: boolean;

    @Index()
    @Column({type: 'timestamptz', nullable: true, name: 'last_sent_at'})
    lastSentAt: Date | null;
}
