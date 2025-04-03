import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EventConfig } from './event-config.entity';
import { Attendance } from '../../attendance/entity/attendance.entity';

@Entity({ name: 'events' })
@Index(['startDate', 'endDate'])
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ name: 'start_date' })
  @Index()
  startDate: Date;

  @Column({ name: 'end_date' })
  @Index()
  endDate: Date;

  @ManyToOne(() => EventConfig, (eventConfig) => eventConfig.events, {
    cascade: true,
    nullable: true,
  })
  @JoinColumn({ name: 'event_config_id' })
  eventConfig: EventConfig;

  @Column({ nullable: true })
  @Index()
  recurringEventId: string;

  @Column({ default: false })
  markedAbsent: boolean;

  @OneToMany(() => Attendance, (attendance) => attendance.event)
  attendances: Attendance[];

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
