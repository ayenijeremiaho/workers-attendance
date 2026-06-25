import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../utility/entity/base.entity';
import { RentalDiscountType, RentalMemberCategory } from '../enum/rental.enum';

@Entity({ name: 'rental_pricing_tiers' })
export class RentalPricingTier extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  memberCategory: RentalMemberCategory;

  @Column({ type: 'varchar' })
  discountType: RentalDiscountType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  discountValue: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
