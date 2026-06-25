import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../../utility/entity/base.entity';
import { RentalBooking } from './rental-booking.entity';
import { RentalPaymentStatus, RentalPaymentType } from '../enum/rental.enum';

@Entity({ name: 'rental_payments' })
export class RentalPayment extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => RentalBooking, (b) => b.payments, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  booking: RentalBooking;

  @Column({ type: 'varchar' })
  type: RentalPaymentType;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', default: RentalPaymentStatus.PENDING })
  status: RentalPaymentStatus;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  refundedAt: Date;

  @Column({ type: 'varchar', nullable: true })
  reference: string;

  @Column({ type: 'varchar', nullable: true })
  proofUrl: string;
}
