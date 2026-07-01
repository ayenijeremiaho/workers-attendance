import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../../utility/entity/base.entity';
import { FirstTimer } from './first-timer.entity';
import { Event } from '../../event/entity/event.entity';

@Entity({ name: 'first_timer_visits' })
export class FirstTimerVisit extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => FirstTimer, (ft) => ft.visits, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'first_timer_id' })
  firstTimer: FirstTimer;

  @ManyToOne(() => Event, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'event_id' })
  event: Event | null;

  @Column({ name: 'visited_at', type: 'date' })
  visitedAt: string;

  @Column({ nullable: true, type: 'text' })
  notes: string | null;
}
