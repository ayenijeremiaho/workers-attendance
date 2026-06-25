export enum RentalMemberCategory {
  PUBLIC = 'PUBLIC',
  MEMBER = 'MEMBER',
  WORKER = 'WORKER',
  LEADER = 'LEADER',
}

export enum RentalDiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FLAT = 'FLAT',
}

export enum RentalDiscountSource {
  NONE = 'NONE',
  TIER = 'TIER',
  OVERRIDE = 'OVERRIDE',
}

export enum RentalBookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
}

export enum RentalPaymentType {
  SERVICE_FEE = 'SERVICE_FEE',
  CAUTION = 'CAUTION',
}

export enum RentalPaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  REFUNDED = 'REFUNDED',
}
