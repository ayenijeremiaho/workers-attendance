import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ServiceSlot } from './service-slot.entity';

@Entity({ name: 'events' })
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Index()
  @Column({ name: 'event_date', type: 'date' })
  eventDate: Date;

  @Column({ nullable: true })
  @Index()
  recurringEventId: string;

  @OneToMany(() => ServiceSlot, (slot) => slot.event, { cascade: true })
  serviceSlots: ServiceSlot[];

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
