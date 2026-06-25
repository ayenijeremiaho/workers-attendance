import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../../utility/entity/base.entity';
import { RentalBooking } from './rental-booking.entity';
import { RentalAddon } from './rental-addon.entity';

@Entity({ name: 'rental_booking_addons' })
export class RentalBookingAddon extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => RentalBooking, (b) => b.bookingAddons, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  booking: RentalBooking;

  @ManyToOne(() => RentalAddon, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn()
  addon: RentalAddon;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  unitCaution: number;
}
