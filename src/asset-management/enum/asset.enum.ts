export enum AssetStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  UNDER_MAINTENANCE = 'UNDER_MAINTENANCE',
  DECOMMISSIONED = 'DECOMMISSIONED',
}

export enum MaintenanceFrequencyUnit {
  DAYS = 'DAYS',
  WEEKS = 'WEEKS',
  MONTHS = 'MONTHS',
}

export enum MaintenanceRecordType {
  SCHEDULED = 'SCHEDULED',
  UNPLANNED = 'UNPLANNED',
}

export enum MaintenanceCompletionStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export enum AssetCondition {
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  POOR = 'POOR',
}
