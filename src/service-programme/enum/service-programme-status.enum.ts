export enum ServiceProgrammeStatusEnum {
  DRAFT = 'DRAFT',
  LIVE = 'LIVE',
  COMPLETED = 'COMPLETED',
}

export const ServiceProgrammeStatusLabels: Record<
  ServiceProgrammeStatusEnum,
  string
> = {
  [ServiceProgrammeStatusEnum.DRAFT]: 'Draft',
  [ServiceProgrammeStatusEnum.LIVE]: 'Live',
  [ServiceProgrammeStatusEnum.COMPLETED]: 'Completed',
};
