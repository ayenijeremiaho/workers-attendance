export enum ReminderIntervalPresetEnum {
  MIN_15 = '15m',
  MIN_30 = '30m',
  HOUR_1 = '1h',
  HOURS_3 = '3h',
  HOURS_24 = '24h',
  HOURS_48 = '48h',
}

export const ReminderIntervalPresetLabels: Record<
  ReminderIntervalPresetEnum,
  string
> = {
  [ReminderIntervalPresetEnum.MIN_15]: '15 Minutes Before',
  [ReminderIntervalPresetEnum.MIN_30]: '30 Minutes Before',
  [ReminderIntervalPresetEnum.HOUR_1]: '1 Hour Before',
  [ReminderIntervalPresetEnum.HOURS_3]: '3 Hours Before',
  [ReminderIntervalPresetEnum.HOURS_24]: '24 Hours Before',
  [ReminderIntervalPresetEnum.HOURS_48]: '2 Days Before',
};

export const PRESET_MINUTES: Record<ReminderIntervalPresetEnum, number> = {
  [ReminderIntervalPresetEnum.MIN_15]: 15,
  [ReminderIntervalPresetEnum.MIN_30]: 30,
  [ReminderIntervalPresetEnum.HOUR_1]: 60,
  [ReminderIntervalPresetEnum.HOURS_3]: 180,
  [ReminderIntervalPresetEnum.HOURS_24]: 1440,
  [ReminderIntervalPresetEnum.HOURS_48]: 2880,
};
