import { IsEnum, IsNumber, IsPositive } from 'class-validator';
import { RentalDiscountType, RentalMemberCategory } from '../enum/rental.enum';

export class UpsertRentalPricingTierDto {
  @IsEnum(RentalMemberCategory)
  memberCategory: RentalMemberCategory;

  @IsEnum(RentalDiscountType)
  discountType: RentalDiscountType;

  @IsNumber()
  @IsPositive()
  discountValue: number;
}
