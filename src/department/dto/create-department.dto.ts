import { IsNotEmpty } from 'class-validator';

export class CreateDepartmentDto {
  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  description: string;
}
