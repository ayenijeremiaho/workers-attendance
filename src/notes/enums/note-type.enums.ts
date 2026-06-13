export enum NoteTypeEnum {
    CHILD_NAMING = 'child_naming',
    CHILD_DEDICATION = 'child_dedication',
    MARRIAGE = 'marriage',
}

export const NoteTypeLabels: Record<NoteTypeEnum, string> = {
    [NoteTypeEnum.CHILD_NAMING]: 'Child Naming',
    [NoteTypeEnum.CHILD_DEDICATION]: 'Child Dedication',
    [NoteTypeEnum.MARRIAGE]: 'Marriage',
};
