export enum PrayerDayMode {
  PHYSICAL = 'PHYSICAL',
  VIRTUAL = 'VIRTUAL',
}

export enum PrayerRuleType {
  ROLE_FREQUENCY = 'ROLE_FREQUENCY',
  MIN_LEADERS_PER_MEETING = 'MIN_LEADERS_PER_MEETING',
  MAX_PER_MEETING = 'MAX_PER_MEETING',
}

export enum PrayerAssignmentType {
  FIXED = 'FIXED',
  SELF_SELECTED = 'SELF_SELECTED',
  AUTO_ASSIGNED = 'AUTO_ASSIGNED',
}

export enum PrayerRosterStatus {
  SCHEDULED = 'SCHEDULED',
  RESCHEDULED = 'RESCHEDULED',
}

export enum PrayerMeetingStatus {
  SCHEDULED = 'SCHEDULED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum PrayerWindowStatus {
  PENDING = 'PENDING',
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}
