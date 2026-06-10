import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Member } from './member.entity';
import { WorkerStatusEnum } from '../enums/worker-status.enum';
import { Department } from '../../department/entity/department.entity';

@Entity({ name: 'worker_profiles' })
export class WorkerProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Member, (member) => member.workerProfile)
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @Index()
  @ManyToOne(() => Department, (department) => department.id)
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Index()
  @Column({
    type: 'enum',
    enum: WorkerStatusEnum,
    enumName: 'worker_status',
    default: WorkerStatusEnum.ACTIVE,
  })
  status: WorkerStatusEnum;

  @Column({ nullable: true })
  profession: string;

  @Column({ nullable: true, type: 'date' })
  yearJoinedWorkforce: Date;

  @Column({ default: false })
  completedSOD: boolean;

  @Column({ default: false })
  completedBibleCollege: boolean;

  @OneToMany('RequestLeave', (leave: any) => leave.workerProfile)
  leaveRequests: any[];

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
