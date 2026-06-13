export enum LeaveStatusEnum {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
}

export const LeaveStatusLabels: Record<LeaveStatusEnum, string> = {
    [LeaveStatusEnum.PENDING]: 'Pending',
    [LeaveStatusEnum.APPROVED]: 'Approved',
    [LeaveStatusEnum.REJECTED]: 'Rejected',
};
