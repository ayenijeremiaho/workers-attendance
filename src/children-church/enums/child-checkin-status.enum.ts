export enum ChildCheckInStatusEnum {
  CHECKED_IN = 'CHECKED_IN',
  CHECKED_OUT = 'CHECKED_OUT',
  FLAGGED = 'FLAGGED',
}

export const ChildCheckInStatusLabels: Record<ChildCheckInStatusEnum, string> =
  {
    [ChildCheckInStatusEnum.CHECKED_IN]: 'Checked In',
    [ChildCheckInStatusEnum.CHECKED_OUT]: 'Checked Out',
    [ChildCheckInStatusEnum.FLAGGED]: 'Flagged',
  };
