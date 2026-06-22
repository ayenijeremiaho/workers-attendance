import { IsBoolean, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class GrantAdminDto {
  @IsUUID()
  @IsNotEmpty()
  memberId: string;

  @IsUUID()
  @IsNotEmpty()
  adminRoleId: string;
}

export class UpdateAdminUserDto {
  @IsUUID()
  @IsOptional()
  adminRoleId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
