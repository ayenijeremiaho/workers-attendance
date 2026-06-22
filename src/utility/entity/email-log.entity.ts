import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type EmailLogStatus = 'sent' | 'failed';

@Entity('email_logs')
@Index('IDX_email_logs_recipient', ['recipient'])
@Index('IDX_email_logs_status', ['status'])
@Index('IDX_email_logs_createdAt', ['createdAt'])
export class EmailLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  recipient: string;

  @Column({ nullable: true })
  subject: string;

  @Column({ type: 'varchar' })
  status: EmailLogStatus;

  @Column({ nullable: true })
  jobId: string;

  @Column({ nullable: true, type: 'text' })
  errorMessage: string;

  @Column({ type: 'int', default: 0 })
  attemptsMade: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
