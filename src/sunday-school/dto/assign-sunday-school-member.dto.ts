import {IsUUID} from 'class-validator';

export class AssignSundaySchoolMemberDto {
    @IsUUID('4')
    memberId: string;
}
