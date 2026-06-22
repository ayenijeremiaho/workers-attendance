import { IsNumber, IsOptional, Min } from 'class-validator';

export class PaginationRequestDto {
  @IsNumber()
  @Min(1)
  page: number;

  @IsNumber()
  @Min(1)
  limit: number;

  @IsOptional()
  sort: string;
}
