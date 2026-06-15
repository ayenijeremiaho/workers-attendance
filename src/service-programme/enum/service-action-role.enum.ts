export enum ServiceActionRoleEnum {
    ADMIN = 'ADMIN',
    WORKER = 'WORKER',
}

export const ServiceActionRoleLabels: Record<ServiceActionRoleEnum, string> = {
    [ServiceActionRoleEnum.ADMIN]: 'Admin',
    [ServiceActionRoleEnum.WORKER]: 'Worker',
};
