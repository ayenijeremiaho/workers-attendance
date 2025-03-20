import { ConfigType } from '@nestjs/config';
import { JwtPayload } from '../interface/auth.interface';
import refreshJwtConfig from '../../config/refresh.jwt.config';
import { Request } from 'express';
import { AuthService } from '../auth.service';
declare const RefreshJwtStrategy_base: new (...args: any) => any;
export declare class RefreshJwtStrategy extends RefreshJwtStrategy_base {
    private readonly authService;
    constructor(refreshJwtConfiguration: ConfigType<typeof refreshJwtConfig>, authService: AuthService);
    validate(request: Request, payload: JwtPayload): Promise<import("../interface/auth.interface").UserAuth>;
}
export {};
