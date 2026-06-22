export enum MemberStatusEnum {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export const MemberStatusLabels: Record<MemberStatusEnum, string> = {
  [MemberStatusEnum.ACTIVE]: 'Active',
  [MemberStatusEnum.INACTIVE]: 'Inactive',
};
