import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Event } from './event.entity';

@Entity({ name: 'event_config' })
export class EventConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Event, (event) => event.eventConfig, { nullable: true })
  event: Event | null;

  @Column({ name: 'checkin_start_time_in_seconds' })
  checkinStartTimeInSeconds: number;

  @Column({ name: 'late_coming_start_time_in_seconds' })
  lateComingStartTimeInSeconds: number;

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
}
