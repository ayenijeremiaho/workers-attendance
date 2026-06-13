export enum AnnouncementAudienceEnum {
    ALL = 'ALL',
    WORKERS_ONLY = 'WORKERS_ONLY',
    DEPARTMENT = 'DEPARTMENT',
    INDIVIDUAL = 'INDIVIDUAL',
}

export const AnnouncementAudienceLabels: Record<AnnouncementAudienceEnum, string> = {
    [AnnouncementAudienceEnum.ALL]: 'Everyone',
    [AnnouncementAudienceEnum.WORKERS_ONLY]: 'Workers Only',
    [AnnouncementAudienceEnum.DEPARTMENT]: 'Department',
    [AnnouncementAudienceEnum.INDIVIDUAL]: 'Individual Member',
};
