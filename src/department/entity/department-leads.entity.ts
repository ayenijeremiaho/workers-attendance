import {
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Worker } from '../../user/entity/worker.entity';
import { Department } from './department.entity';

@Entity({ name: 'department_leads' })
@Unique(['worker', 'department'])
export class DepartmentLeads {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToMany(() => Worker, (worker) => worker.id)
  worker: Worker;

  @OneToMany(() => Department, (department) => department.id)
  department: Department;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
