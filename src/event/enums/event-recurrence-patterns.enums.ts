export enum EventRecurrencePatternEnum {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export const EventRecurrencePatternLabels: Record<
  EventRecurrencePatternEnum,
  string
> = {
  [EventRecurrencePatternEnum.DAILY]: 'Daily',
  [EventRecurrencePatternEnum.WEEKLY]: 'Weekly',
  [EventRecurrencePatternEnum.MONTHLY]: 'Monthly',
};
