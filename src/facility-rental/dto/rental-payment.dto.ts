import { IsOptional, IsString } from 'class-validator';

export class MarkPaymentPaidDto {
  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  proofUrl?: string;
}
