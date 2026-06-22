export enum DepartmentLeadTypeEnum {
  HOD = 'HOD',
  D_HOD = 'D. HOD',
}

export const DepartmentLeadTypeLabels: Record<DepartmentLeadTypeEnum, string> =
  {
    [DepartmentLeadTypeEnum.HOD]: 'Head of Department',
    [DepartmentLeadTypeEnum.D_HOD]: 'Deputy Head of Department',
  };
