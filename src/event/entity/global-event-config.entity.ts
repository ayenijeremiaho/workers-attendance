import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'global_event_config' })
export class GlobalEventConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'checkin_start_time_in_seconds' })
  checkinStartTimeInSeconds: number;

  @Column({ name: 'late_coming_start_time_in_seconds' })
  lateComingStartTimeInSeconds: number;

  @Column({
    name: 'default_location_latitude',
    type: 'decimal',
    precision: 10,
    scale: 8,
  })
  defaultLocationLongitude: number;

  @Column({
    name: 'default_location_longitude',
    type: 'decimal',
    precision: 11,
    scale: 8,
  })
  defaultLocationLatitude: number;
}
