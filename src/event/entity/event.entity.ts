import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EventConfig } from './event-config.entity';
import { RecurringEvent } from './recurring-event.entity';

@Entity({ name: 'events' })
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ name: 'start_date' })
  startDate: Date;

  @Column({ name: 'end_date' })
  endDate: Date;

  @OneToOne(() => EventConfig, (eventConfig) => eventConfig.event, {
    cascade: true,
    nullable: true,
  })
  @JoinColumn({ name: 'event_config_id' })
  eventConfig: EventConfig;

  @ManyToOne(() => RecurringEvent, (recurringEvent) => recurringEvent.events, {
    nullable: true,
  })
  @JoinColumn({ name: 'recurring_event_id' })
  recurringEvent: RecurringEvent;
}
