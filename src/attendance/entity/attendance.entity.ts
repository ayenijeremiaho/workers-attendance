import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { CheckInStatusEnum } from '../enums/check-in.enum';
import { Event } from '../../event/entity/event.entity';
import { Worker } from '../../user/entity/worker.entity';

@Entity({ name: 'attendances' })
@Unique(['worker', 'event'])
export class Attendance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => Event, (event) => event.attendances)
  @JoinColumn({ name: 'event_id' })
  event: Event;

  @Index()
  @ManyToOne(() => Worker, (worker) => worker.attendances)
  @JoinColumn({ name: 'worker_id' })
  worker: Worker;

  @Index()
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  checkinTime: Date;

  @Column({
    enum: CheckInStatusEnum,
    type: 'enum',
    enumName: 'check_in_status',
  })
  checkinStatus: CheckInStatusEnum;

  @Column({ type: 'json', name: 'worker_location' })
  workerLocation: {
    longitude: number;
    latitude: number;
  };

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
