export enum CurrencyCode {
  NGN = 'NGN',
  USD = 'USD',
  GBP = 'GBP',
  EUR = 'EUR',
}

export const CurrencyCodeLabels: Record<CurrencyCode, string> = {
  [CurrencyCode.NGN]: 'Nigerian Naira (₦)',
  [CurrencyCode.USD]: 'US Dollar ($)',
  [CurrencyCode.GBP]: 'British Pound (£)',
  [CurrencyCode.EUR]: 'Euro (€)',
};

export enum TitheBatchStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum TitheUnmatchedStatus {
  PENDING = 'PENDING',
  MATCHED = 'MATCHED',
  DISMISSED = 'DISMISSED',
}

export enum TitheDisputeStatus {
  PENDING = 'PENDING',
  CONFIRMED_VALID = 'CONFIRMED_VALID',
  REJECTED = 'REJECTED',
}

export enum TitheProofStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  DECLINED = 'DECLINED',
}
