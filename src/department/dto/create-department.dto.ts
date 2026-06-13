import {IsEnum, IsNotEmpty, IsOptional} from 'class-validator';
import {DepartmentKeyEnum} from '../enums/department-key.enum';

export class CreateDepartmentDto {
    @IsNotEmpty()
    name: string;

    @IsNotEmpty()
    description: string;

    @IsOptional()
    @IsEnum(DepartmentKeyEnum)
    key?: DepartmentKeyEnum;
}
