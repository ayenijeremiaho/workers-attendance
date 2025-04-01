import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Event } from './event.entity';

@Entity({ name: 'event_config' })
export class EventConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @OneToMany(() => Event, (event) => event.eventConfig, { nullable: true })
  events: Event[];

  @Column({ name: 'checkin_start_time_in_seconds' })
  checkinStartTimeInSeconds: number;

  @Column({ name: 'late_coming_start_time_in_seconds' })
  lateComingStartTimeInSeconds: number;

  @Column({ name: 'checkin_stop_time_in_seconds' })
  checkinStopTimeInSeconds: number;

  @Column({
    name: 'location_latitude',
    type: 'decimal',
    precision: 10,
    scale: 8,
  })
  locationLongitude: number;

  @Column({
    name: 'location_longitude',
    type: 'decimal',
    precision: 11,
    scale: 8,
  })
  locationLatitude: number;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
