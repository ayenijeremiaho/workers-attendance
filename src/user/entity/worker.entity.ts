import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { UserTypeEnum } from '../enums/user-type.enum';
import { User } from './user.entity';
import { Department } from '../../department/entity/department.entity';
import { WorkerStatusEnum } from '../enums/worker-status.enum';
import { Attendance } from '../../attendance/entity/attendance.entity';
import { MaritalStatusEnum } from '../enums/marital-status.enum';

@Entity({ name: 'workers' })
export class Worker extends User {
  @ManyToOne(() => Department, (department) => department.id)
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({
    type: 'enum',
    enum: WorkerStatusEnum,
    default: WorkerStatusEnum.ACTIVE,
  })
  status: WorkerStatusEnum;

  @Column({ nullable: true })
  yearBaptized: Date;

  @Column({ nullable: true })
  yearBornAgain: Date;

  @Column({ nullable: true })
  profession: string;

  @Column({
    type: 'enum',
    enum: MaritalStatusEnum,
    nullable: true,
  })
  maritalStatus: MaritalStatusEnum;

  @Column({ nullable: true })
  yearJoinedWorkforce: Date;

  @Column({ default: false })
  completedSOD: boolean;

  @Column({ default: false })
  completedBibleCollege: boolean;

  @OneToMany(() => Attendance, (attendance) => attendance.event)
  attendances: Attendance[];

  public getType(): UserTypeEnum {
    return UserTypeEnum.WORKER;
  }
}
