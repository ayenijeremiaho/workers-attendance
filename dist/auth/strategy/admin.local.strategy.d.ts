import { AuthService } from '../auth.service';
declare const AdminLocalStrategy_base: new (...args: any) => any;
export declare class AdminLocalStrategy extends AdminLocalStrategy_base {
    private readonly authService;
    constructor(authService: AuthService);
    validate(email: string, password: string): Promise<import("../interface/auth.interface").UserAuth>;
}
export {};
