import {IsArray, IsEnum, IsNotEmpty, IsOptional, IsString} from 'class-validator';
import {AdminPermission} from '../enum/admin-permission.enum';

export class CreateAdminRoleDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsArray()
    @IsEnum(AdminPermission, {each: true})
    permissions: AdminPermission[];
}

export class UpdateAdminRoleDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsArray()
    @IsEnum(AdminPermission, {each: true})
    @IsOptional()
    permissions?: AdminPermission[];
}
