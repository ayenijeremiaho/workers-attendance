import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigType } from '@nestjs/config';
import { JwtPayload } from '../interface/auth.interface';
import { Inject, Injectable } from '@nestjs/common';
import refreshJwtConfig from '../../config/refresh.jwt.config';
import { Request } from 'express';
import { AuthService } from '../service/auth.service';

@Injectable()
export class RefreshJwtStrategy extends PassportStrategy(
  Strategy,
  'refresh-jwt',
) {
  constructor(
    @Inject(refreshJwtConfig.KEY)
    refreshJwtConfiguration: ConfigType<typeof refreshJwtConfig>,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: refreshJwtConfiguration.secret,
      ignoreExpiration: false,
      passReqToCallback: true,
    });
  }

  async validate(request: Request, payload: JwtPayload) {
    const refreshToken = request
      .get('Authorization')
      .replace('Bearer ', '')
      .trim();

    return this.authService.validateRefreshToken(
      payload.sub,
      payload.role,
      refreshToken,
    );
  }
}
