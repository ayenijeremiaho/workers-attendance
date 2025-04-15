import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Worker } from '../../user/entity/worker.entity';
import { LeaveStatusEnum } from '../enums/leave-status.enum';
import { Admin } from '../../user/entity/admin.entity';

@Entity({ name: 'request_leave' })
export class RequestLeave {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Worker, (worker) => worker.id)
  @JoinColumn({ name: 'worker_id' })
  worker: Worker;

  @Column({ type: 'timestamp' })
  dateFrom: Date;

  @Column({ type: 'timestamp' })
  dateTo: Date;

  @Column({ type: 'varchar', length: 255 })
  reason: string;

  @Column({
    type: 'enum',
    enum: LeaveStatusEnum,
    enumName: 'leave_status',
  })
  status: LeaveStatusEnum;

  @ManyToOne(() => Admin, (admin) => admin.id)
  @JoinColumn({ name: 'actioned_by' })
  actionedBy: Admin;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
