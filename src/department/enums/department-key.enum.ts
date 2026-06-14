export enum DepartmentKeyEnum {
    SUNDAY_SCHOOL = 'SUNDAY_SCHOOL',
    CHILDREN_CHURCH = 'CHILDREN_CHURCH',
    WORSHIP = 'WORSHIP',
    USHERING = 'USHERING',
    MEDIA = 'MEDIA',
    PROTOCOL = 'PROTOCOL',
    WELFARE = 'WELFARE',
    PRAYER = 'PRAYER',
    EVANGELISM = 'EVANGELISM',
    YOUTH = 'YOUTH',
    YOUNG_ADULTS = 'YOUNG_ADULTS',
    FOLLOW_UP = 'FOLLOW_UP',
}

export const DepartmentKeyLabels: Record<DepartmentKeyEnum, string> = {
    [DepartmentKeyEnum.SUNDAY_SCHOOL]: 'Sunday School',
    [DepartmentKeyEnum.CHILDREN_CHURCH]: "Children's Church",
    [DepartmentKeyEnum.WORSHIP]: 'Worship',
    [DepartmentKeyEnum.USHERING]: 'Ushering',
    [DepartmentKeyEnum.MEDIA]: 'Media',
    [DepartmentKeyEnum.PROTOCOL]: 'Protocol',
    [DepartmentKeyEnum.WELFARE]: 'Welfare',
    [DepartmentKeyEnum.PRAYER]: 'Prayer',
    [DepartmentKeyEnum.EVANGELISM]: 'Evangelism',
    [DepartmentKeyEnum.YOUTH]: 'Youth',
    [DepartmentKeyEnum.YOUNG_ADULTS]: 'Young Adults',
    [DepartmentKeyEnum.FOLLOW_UP]: 'Follow-Up',
};
