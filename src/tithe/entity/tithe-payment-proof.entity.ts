import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../../utility/entity/base.entity';
import { Member } from '../../member/entity/member.entity';
import { Admin } from '../../admin/entity/admin.entity';
import { TitheAccount } from './tithe-account.entity';
import { TitheProofStatus } from '../enum/tithe.enum';

@Entity({ name: 'tithe_payment_proofs' })
export class TithePaymentProof extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => Member, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @Index()
  @ManyToOne(() => TitheAccount, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tithe_account_id' })
  titheAccount: TitheAccount;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: number;

  @Index()
  @Column({ type: 'date' })
  paymentDate: string;

  @Column({ type: 'character varying', nullable: true })
  reference: string;

  @Column({ type: 'character varying' })
  proofUrl: string;

  @Column({ type: 'character varying' })
  publicId: string;

  @Column({ type: 'character varying' })
  resourceType: string;

  @Column({ type: 'character varying', default: TitheProofStatus.PENDING })
  status: TitheProofStatus;

  @ManyToOne(() => Admin, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewed_by' })
  reviewedBy: Admin;

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt: Date;

  @Column({ type: 'character varying', nullable: true })
  financeNote: string;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;
}
