import { SetMetadata } from '@nestjs/common';
import { MemberRoleEnum } from '../../member/enums/member-role.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: MemberRoleEnum[]) =>
  SetMetadata(ROLES_KEY, roles);
