export enum WorkerStatusEnum {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export const WorkerStatusLabels: Record<WorkerStatusEnum, string> = {
  [WorkerStatusEnum.ACTIVE]: 'Active',
  [WorkerStatusEnum.INACTIVE]: 'Inactive',
};
