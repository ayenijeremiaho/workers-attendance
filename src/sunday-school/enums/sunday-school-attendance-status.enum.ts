export enum SundaySchoolAttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  EXCUSED = 'EXCUSED',
}

export const SundaySchoolAttendanceStatusLabels: Record<
  SundaySchoolAttendanceStatus,
  string
> = {
  [SundaySchoolAttendanceStatus.PRESENT]: 'Present',
  [SundaySchoolAttendanceStatus.ABSENT]: 'Absent',
  [SundaySchoolAttendanceStatus.EXCUSED]: 'Excused',
};
