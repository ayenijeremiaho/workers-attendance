export enum ServiceSessionSlotStatusEnum {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
}

export const ServiceSessionSlotStatusLabels: Record<
  ServiceSessionSlotStatusEnum,
  string
> = {
  [ServiceSessionSlotStatusEnum.PENDING]: 'Pending',
  [ServiceSessionSlotStatusEnum.IN_PROGRESS]: 'In Progress',
  [ServiceSessionSlotStatusEnum.COMPLETED]: 'Completed',
  [ServiceSessionSlotStatusEnum.SKIPPED]: 'Skipped',
};
