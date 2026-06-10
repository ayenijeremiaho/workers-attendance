import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { AttendanceStatusEnum } from '../enums/check-in.enum';
import { Member } from '../../member/entity/member.entity';
import { ServiceSlot } from '../../event/entity/service-slot.entity';
import { MemberRoleEnum } from '../../member/enums/member-role.enum';

@Entity({ name: 'attendances' })
@Unique(['member', 'serviceSlot'])
@Index(['member', 'roleAtCheckin', 'createdAt'])
export class Attendance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => Member, (member) => member.attendances, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @Index()
  @ManyToOne(() => ServiceSlot, (slot) => slot.attendances, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_slot_id' })
  serviceSlot: ServiceSlot;

  @Index()
  @Column({ type: 'timestamp', nullable: true })
  checkinTime: Date;

  @Index()
  @Column({
    type: 'enum',
    enum: AttendanceStatusEnum,
    enumName: 'attendance_status',
  })
  status: AttendanceStatusEnum;

  @Index()
  @Column({
    type: 'enum',
    enum: MemberRoleEnum,
    enumName: 'attendee_role',
  })
  roleAtCheckin: MemberRoleEnum;

  @Column({ type: 'json', name: 'location', nullable: true })
  location: { longitude: number; latitude: number } | null;

  @Index()
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
