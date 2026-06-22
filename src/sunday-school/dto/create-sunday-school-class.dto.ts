import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateSundaySchoolClassDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID('4')
  @IsOptional()
  teacherId?: string;
}

export class UpdateSundaySchoolClassDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID('4')
  @IsOptional()
  teacherId?: string;
}
