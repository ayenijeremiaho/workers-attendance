import { UserTypeEnum } from '../../user/enums/user-type.enum';

export interface JwtPayload {
  sub: string;
  role: UserTypeEnum;
}

export interface JwtResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

export interface UserAuth {
  id: string;
  role: UserTypeEnum;
}
