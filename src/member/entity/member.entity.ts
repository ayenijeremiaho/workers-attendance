import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MemberRoleEnum } from '../enums/member-role.enum';
import { MemberStatusEnum } from '../enums/member-status.enum';
import { GenderEnum } from '../enums/gender.enum';
import { MaritalStatusEnum } from '../enums/marital-status.enum';
import { WorkerProfile } from './worker-profile.entity';

@Entity({ name: 'members' })
export class Member {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstname: string;

  @Column()
  lastname: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column()
  password: string;

  @Column({ default: false })
  changedPassword: boolean;

  @Index()
  @Column({
    type: 'enum',
    enum: MemberRoleEnum,
    enumName: 'member_role',
    default: MemberRoleEnum.MEMBER,
  })
  role: MemberRoleEnum;

  @Index()
  @Column({
    type: 'enum',
    enum: MemberStatusEnum,
    enumName: 'member_status',
    default: MemberStatusEnum.ACTIVE,
  })
  status: MemberStatusEnum;

  @Column({
    type: 'enum',
    enum: GenderEnum,
    enumName: 'gender',
    nullable: true,
  })
  gender: GenderEnum;

  @Column({ nullable: true })
  dateOfBirth: string;

  @Column({
    type: 'enum',
    enum: MaritalStatusEnum,
    enumName: 'marital_status',
    nullable: true,
  })
  maritalStatus: MaritalStatusEnum;

  @Column({ nullable: true, type: 'date' })
  yearBornAgain: Date;

  @Column({ nullable: true, type: 'date' })
  yearBaptized: Date;

  @Column({ nullable: true, default: false })
  baptizedWithHolyGhost: boolean;

  @Column({ nullable: true, type: 'date' })
  yearJoinedChurch: Date;

  @OneToOne(() => WorkerProfile, (wp) => wp.member, {
    nullable: true,
    cascade: true,
    eager: false,
  })
  workerProfile: WorkerProfile;

  @OneToMany('Attendance', (attendance: any) => attendance.member)
  attendances: any[];

  @OneToMany('ClassEnrollment', (enrollment: any) => enrollment.member)
  classEnrollments: any[];

  @Index()
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
