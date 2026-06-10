import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AnnouncementAudienceEnum } from '../enum/announcement-audience.enum';
import { Member } from '../../member/entity/member.entity';
import { Department } from '../../department/entity/department.entity';

@Entity('announcements')
export class Announcement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  body: string;

  @ManyToOne(() => Member, { nullable: true, onDelete: 'SET NULL' })
  author: Member | null;

  @Index()
  @Column({ type: 'enum', enum: AnnouncementAudienceEnum, default: AnnouncementAudienceEnum.ALL })
  audience: AnnouncementAudienceEnum;

  @ManyToOne(() => Department, { nullable: true, onDelete: 'SET NULL' })
  department: Department | null;

  @ManyToOne(() => Member, { nullable: true, onDelete: 'SET NULL' })
  targetMember: Member | null;

  @Index()
  @Column({ type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @Index()
  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
