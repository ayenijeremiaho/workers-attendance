import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import { ChurchClassTypeEnum } from '../enum/church-class-type.enum';

export class CreateChurchClassDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsEnum(ChurchClassTypeEnum)
  type: ChurchClassTypeEnum;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  facilitatorId?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'startDate must be YYYY-MM-DD' })
  startDate?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'endDate must be YYYY-MM-DD' })
  endDate?: string;
}

export class UpdateChurchClassDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  facilitatorId?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'startDate must be YYYY-MM-DD' })
  startDate?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'endDate must be YYYY-MM-DD' })
  endDate?: string;
}
