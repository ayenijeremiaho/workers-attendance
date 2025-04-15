import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Worker } from '../../user/entity/worker.entity';
import { Department } from './department.entity';
import { DepartmentLeadTypeEnum } from '../enums/department-lead-type.enum';

@Entity({ name: 'department_leads' })
@Unique(['department', 'leadType'])
export class DepartmentLead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Worker, (worker) => worker.id)
  @JoinColumn({ name: 'lead_id' })
  lead: Worker;

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
