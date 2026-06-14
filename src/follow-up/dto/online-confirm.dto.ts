import {IsUUID} from 'class-validator';

export class OnlineConfirmDto {
    @IsUUID()
    eventId: string;
}
