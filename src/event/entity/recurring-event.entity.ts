import {
  Column,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Event } from './event.entity';
import { EventConfig } from './event-config.entity';
import { EventRecurrencePatternEnum } from '../enums/event-recurrence-patterns.enums';

@Entity({ name: 'recurring_events' })
export class RecurringEvent {
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

  @Column({
    type: 'enum',
    enum: EventRecurrencePatternEnum,
    enumName: 'recurrence_pattern',
  })
  recurrencePattern: EventRecurrencePatternEnum;

  @Column({ name: 'recurrence_interval', default: 1 })
  recurrenceInterval: number;

  @Column({ name: 'recurrence_start_date' })
  recurrenceStartDate: Date;

  @Column({ name: 'recurrence_end_date' })
  recurrenceEndDate: Date;

  @OneToMany(() => Event, (event) => event.recurringEvent)
  events: Event[];

  @OneToOne(() => EventConfig, { cascade: true, nullable: true })
  eventConfig: EventConfig | null;
}
