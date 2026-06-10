import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { WorkerProfile } from '../../member/entity/worker-profile.entity';
import { Department } from './department.entity';
import { DepartmentLeadTypeEnum } from '../enums/department-lead-type.enum';

@Entity({ name: 'department_leads' })
@Unique(['department', 'leadType'])
export class DepartmentLead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @OneToOne(() => WorkerProfile)
  @JoinColumn({ name: 'worker_profile_id' })
  workerProfile: WorkerProfile;

  @ManyToOne(() => Department, (department) => department.id)
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({
    type: 'enum',
    enum: DepartmentLeadTypeEnum,
    enumName: 'lead_type',
  })
  leadType: DepartmentLeadTypeEnum;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
