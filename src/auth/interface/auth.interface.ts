import { UserType } from '../../user/enums/user-type';

export interface JwtPayload {
  sub: string;
  role: UserType;
}

export interface JwtResponse {
  access_token: string;
  refresh_token?: string;
}

export interface UserAuth {
  id: string;
  role: UserType;
}
