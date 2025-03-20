import { ConfigType } from '@nestjs/config';
import jwtConfig from '../../config/jwt.config';
import { JwtPayload } from '../interface/auth.interface';
import { AuthService } from '../auth.service';
declare const JwtStrategy_base: new (...args: any) => any;
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly authService;
    constructor(jwtConfiguration: ConfigType<typeof jwtConfig>, authService: AuthService);
    validate(payload: JwtPayload): Promise<import("../interface/auth.interface").UserAuth>;
}
export {};
