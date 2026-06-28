export enum ChurchClassTypeEnum {
  BELIEVERS = 'BELIEVERS',
  BAPTISMAL = 'BAPTISMAL',
  WORKERS_IN_TRAINING = 'WORKERS_IN_TRAINING',
  BIBLE_COLLEGE = 'BIBLE_COLLEGE',
  SCHOOL_OF_DISCIPLESHIP = 'SCHOOL_OF_DISCIPLESHIP',
}

export const ChurchClassTypeLabels: Record<ChurchClassTypeEnum, string> = {
  [ChurchClassTypeEnum.BELIEVERS]: "Believers' Class",
  [ChurchClassTypeEnum.BAPTISMAL]: 'Baptismal Class',
  [ChurchClassTypeEnum.WORKERS_IN_TRAINING]: 'Workers in Training',
  [ChurchClassTypeEnum.BIBLE_COLLEGE]: 'Bible College',
  [ChurchClassTypeEnum.SCHOOL_OF_DISCIPLESHIP]: 'School of Discipleship',
};
