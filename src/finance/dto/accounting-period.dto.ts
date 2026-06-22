import {IsInt, Max, Min} from 'class-validator';
import {Type} from 'class-transformer';

export class CreateAccountingPeriodDto {
    @Type(() => Number)
    @IsInt()
    @Min(2000)
    year: number;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(12)
    month: number;
}
