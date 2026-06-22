import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../../utility/entity/base.entity';
import { FollowUpTask } from './follow-up-task.entity';
import { WorkerProfile } from '../../member/entity/worker-profile.entity';

@Entity({ name: 'follow_up_notes' })
export class FollowUpNote extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => FollowUpTask, (task) => task.notes, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'task_id' })
  task: FollowUpTask;

  @ManyToOne(() => WorkerProfile, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'added_by_id' })
  addedBy: WorkerProfile | null;

  @Column({ type: 'text' })
  content: string;
}
