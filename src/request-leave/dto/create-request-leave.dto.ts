import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateRequestLeaveDto {
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/, {
    message: 'dateFrom must be in the format YYYY-MM-DD HH:mm',
  })
  dateFrom: Date;

  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/, {
    message: 'dateTo must be in the format YYYY-MM-DD HH:mm',
  })
  dateTo: Date;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
