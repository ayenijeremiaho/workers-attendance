import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EventConfig } from './event-config.entity';

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
  startDate: Date;

  @Column({ name: 'end_date' })
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

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
