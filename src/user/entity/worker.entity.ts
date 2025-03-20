import { Entity, JoinColumn, ManyToOne } from 'typeorm';
import { UserType } from '../enums/user-type';
import { User } from './user.entity';
import { Department } from '../../department/entity/department.entity';

@Entity({ name: 'workers' })
export class Worker extends User {
  @ManyToOne(() => Department, (department) => department.id)
  @JoinColumn({ name: 'department_id' })
  department: Department;

  public getType(): UserType {
    return UserType.WORKER;
  }
}
