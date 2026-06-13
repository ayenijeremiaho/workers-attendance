export enum EnrollmentStatusEnum {
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
}

export const EnrollmentStatusLabels: Record<EnrollmentStatusEnum, string> = {
    [EnrollmentStatusEnum.IN_PROGRESS]: 'In Progress',
    [EnrollmentStatusEnum.COMPLETED]: 'Completed',
    [EnrollmentStatusEnum.CANCELLED]: 'Cancelled',
};
