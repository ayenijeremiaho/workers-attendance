import {IsDateString, IsOptional, IsUUID} from 'class-validator';

export class PeriodReportQueryDto {
    @IsOptional()
    @IsUUID()
    periodId?: string;

    @IsOptional()
    @IsUUID()
    fundId?: string;
}

export class AccountReportQueryDto {
    @IsUUID()
    accountId: string;

    @IsOptional()
    @IsDateString()
    fromDate?: string;

    @IsOptional()
    @IsDateString()
    toDate?: string;
}

export class MemberGivingQueryDto {
    @IsUUID()
    memberId: string;

    @IsOptional()
    @IsUUID()
    periodId?: string;
}

export class BudgetActualsQueryDto {
    @IsUUID()
    budgetId: string;
}

export class PledgeSummaryQueryDto {
    @IsUUID()
    campaignId: string;
}
