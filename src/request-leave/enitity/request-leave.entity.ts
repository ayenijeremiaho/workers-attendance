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
import { WorkerProfile } from '../../member/entity/worker-profile.entity';
import { Member } from '../../member/entity/member.entity';
import { LeaveStatusEnum } from '../enums/leave-status.enum';

@Entity({ name: 'request_leave' })
export class RequestLeave {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => WorkerProfile, (profile) => profile.leaveRequests, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'worker_profile_id' })
  workerProfile: WorkerProfile;

  @Column({ type: 'timestamp' })
  dateFrom: Date;

  @Column({ type: 'timestamp' })
  dateTo: Date;

  @Column({ type: 'varchar', length: 500 })
  reason: string;

  @Index()
  @Column({
    type: 'enum',
    enum: LeaveStatusEnum,
    enumName: 'leave_status',
    default: LeaveStatusEnum.PENDING,
  })
  status: LeaveStatusEnum;

  @ManyToOne(() => Member, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actioned_by' })
  actionedBy: Member;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
