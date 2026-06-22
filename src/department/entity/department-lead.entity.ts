import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { WorkerProfile } from '../../member/entity/worker-profile.entity';
import { Department } from './department.entity';
import { DepartmentLeadTypeEnum } from '../enums/department-lead-type.enum';
import { BaseEntity } from '../../utility/entity/base.entity';

@Entity({ name: 'department_leads' })
@Unique(['department', 'leadType'])
export class DepartmentLead extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @OneToOne(() => WorkerProfile)
  @JoinColumn({ name: 'worker_profile_id' })
  workerProfile: WorkerProfile;

  @ManyToOne(() => Department, (department) => department.id)
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column()
  leadType: DepartmentLeadTypeEnum;
}
