export enum GenderEnum {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

export const GenderLabels: Record<GenderEnum, string> = {
  [GenderEnum.MALE]: 'Male',
  [GenderEnum.FEMALE]: 'Female',
};
