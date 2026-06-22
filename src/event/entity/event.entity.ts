import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ServiceSlot } from './service-slot.entity';
import { Attendance } from '../../attendance/entity/attendance.entity';
import { BaseEntity } from '../../utility/entity/base.entity';

@Entity({ name: 'events' })
export class Event extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Index()
  @Column({ name: 'event_date', type: 'date' })
  eventDate: Date;

  @Column({ name: 'end_date', type: 'date' })
  endDate: Date;

  @Column({ name: 'attendance_marked', default: false })
  attendanceMarked: boolean;

  @Column({ name: 'online_attendance_enabled', default: false })
  onlineAttendanceEnabled: boolean;

  @Column({
    name: 'online_notification_sent_at',
    nullable: true,
    type: 'timestamptz',
  })
  onlineNotificationSentAt: Date | null;

  @Column({ nullable: true })
  @Index()
  recurringEventId: string;

  @OneToMany(() => ServiceSlot, (slot) => slot.event, { cascade: true })
  serviceSlots: ServiceSlot[];

  @OneToMany(() => Attendance, (a) => a.event)
  attendances: Attendance[];

  /** Populated on GET endpoints — true if the calling user has checked in to any slot of this event. */
  checkedIn?: boolean;

  /** Populated on GET endpoints — details of the user's check-in, or null if not checked in. */
  myCheckin?: {
    slotId: string;
    slotName: string | null;
    status: string;
    checkinTime: Date | null;
  } | null;
}
