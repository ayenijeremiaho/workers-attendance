export enum ServicePauseReasonEnum {
  TECHNICAL_ISSUE = 'TECHNICAL_ISSUE',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  BREAK_INTERVAL = 'BREAK_INTERVAL',
  UNPLANNED_DELAY = 'UNPLANNED_DELAY',
  OTHER = 'OTHER',
}

export const ServicePauseReasonLabels: Record<ServicePauseReasonEnum, string> =
  {
    [ServicePauseReasonEnum.TECHNICAL_ISSUE]: 'Technical Issue',
    [ServicePauseReasonEnum.ANNOUNCEMENT]: 'Announcement',
    [ServicePauseReasonEnum.BREAK_INTERVAL]: 'Break / Interval',
    [ServicePauseReasonEnum.UNPLANNED_DELAY]: 'Unplanned Delay',
    [ServicePauseReasonEnum.OTHER]: 'Other',
  };
