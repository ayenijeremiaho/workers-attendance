import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ServiceSlot } from './service-slot.entity';
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

  @Column({ nullable: true })
  @Index()
  recurringEventId: string;

  @OneToMany(() => ServiceSlot, (slot) => slot.event, { cascade: true })
  serviceSlots: ServiceSlot[];
}
