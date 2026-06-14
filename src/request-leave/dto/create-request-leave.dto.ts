import {IsNotEmpty, IsString, Matches, MaxLength} from 'class-validator';

export class CreateRequestLeaveDto {
    @IsNotEmpty()
    @Matches(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'dateFrom must be in the format YYYY-MM-DD',
    })
    dateFrom: Date;

    @IsNotEmpty()
    @Matches(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'dateTo must be in the format YYYY-MM-DD',
    })
    dateTo: Date;

    @IsString()
    @IsNotEmpty()
    @MaxLength(500)
    reason: string;
}
