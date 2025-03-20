import { AuthService } from '../auth.service';
declare const WorkerLocalStrategy_base: new (...args: any) => any;
export declare class WorkerLocalStrategy extends WorkerLocalStrategy_base {
    private readonly authService;
    constructor(authService: AuthService);
    validate(email: string, password: string): Promise<import("../interface/auth.interface").UserAuth>;
}
export {};
