import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateServiceProgrammeDto {
  @IsBoolean()
  @IsOptional()
  saveAsTemplate?: boolean;
}
