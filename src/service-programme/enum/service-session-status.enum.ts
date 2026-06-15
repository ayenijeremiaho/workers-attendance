export enum ServiceSessionStatusEnum {
    LIVE = 'LIVE',
    COMPLETED = 'COMPLETED',
}

export const ServiceSessionStatusLabels: Record<ServiceSessionStatusEnum, string> = {
    [ServiceSessionStatusEnum.LIVE]: 'Live',
    [ServiceSessionStatusEnum.COMPLETED]: 'Completed',
};
