import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../service/auth.service';
import { Injectable } from '@nestjs/common';
import { UserTypeEnum } from '../../user/enums/user-type.enum';

@Injectable()
export class WorkerLocalStrategy extends PassportStrategy(
  Strategy,
  'worker-local',
) {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'email',
      passwordField: 'password',
    });
  }

  async validate(email: string, password: string) {
    return this.authService.validateUser(email, password, UserTypeEnum.WORKER);
  }
}
