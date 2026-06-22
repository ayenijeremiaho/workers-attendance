export enum AttendanceStatusEnum {
  PRESENT = 'PRESENT',
  LATE = 'LATE',
  ABSENT = 'ABSENT',
  ON_LEAVE = 'ON_LEAVE',
  ATTENDED_ONLINE = 'ATTENDED_ONLINE',
}

export const AttendanceStatusLabels: Record<AttendanceStatusEnum, string> = {
  [AttendanceStatusEnum.PRESENT]: 'Present',
  [AttendanceStatusEnum.LATE]: 'Late',
  [AttendanceStatusEnum.ABSENT]: 'Absent',
  [AttendanceStatusEnum.ON_LEAVE]: 'On Leave',
  [AttendanceStatusEnum.ATTENDED_ONLINE]: 'Attended Online',
};
