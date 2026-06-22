export enum MaritalStatusEnum {
  SINGLE = 'SINGLE',
  MARRIED = 'MARRIED',
  DIVORCED = 'DIVORCED',
  WIDOWED = 'WIDOWED',
}

export const MaritalStatusLabels: Record<MaritalStatusEnum, string> = {
  [MaritalStatusEnum.SINGLE]: 'Single',
  [MaritalStatusEnum.MARRIED]: 'Married',
  [MaritalStatusEnum.DIVORCED]: 'Divorced',
  [MaritalStatusEnum.WIDOWED]: 'Widowed',
};
