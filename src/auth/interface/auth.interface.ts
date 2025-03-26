import { UserTypeEnum } from '../../user/enums/user-type.enum';

export interface JwtPayload {
  sub: string;
  role: UserTypeEnum;
}

export interface JwtResponse {
  access_token: string;
  refresh_token?: string;
}

export interface UserAuth {
  id: string;
  role: UserTypeEnum;
}
