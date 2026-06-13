export enum MemberRoleEnum {
    MEMBER = 'MEMBER',
    WORKER = 'WORKER',
}

export const MemberRoleLabels: Record<MemberRoleEnum, string> = {
    [MemberRoleEnum.MEMBER]: 'Member',
    [MemberRoleEnum.WORKER]: 'Worker',
};
