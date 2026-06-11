import { MemberRoleEnum } from '../../member/enums/member-role.enum';

export interface JwtPayload {
  sub: string;
  role: MemberRoleEnum;
}

export interface JwtResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  requires_password_change: boolean;
}

export interface MemberAuth {
  id: string;
  role: MemberRoleEnum;
  requiresPasswordChange: boolean;
}
