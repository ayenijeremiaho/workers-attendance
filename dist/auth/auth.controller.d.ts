import { AuthService } from './auth.service';
import { JwtResponse } from './interface/auth.interface';
import { WorkerDto } from '../user/dto/worker.dto';
import { AdminDto } from '../user/dto/admin.dto';
import { UserChangePasswordDto } from '../user/dto/user-change-password.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    adminLogin(req: any): Promise<JwtResponse>;
    adminRefresh(req: any): Promise<JwtResponse>;
    adminLogout(req: any): Promise<void>;
    adminProfile(req: any): Promise<AdminDto>;
    changeAdminPassword(req: any, changePasswordDto: UserChangePasswordDto): Promise<string>;
    workerLogin(req: any): Promise<JwtResponse>;
    workerLogout(req: any): Promise<void>;
    workerProfile(req: any): Promise<WorkerDto>;
    changeWorkerPassword(req: any, changePasswordDto: UserChangePasswordDto): Promise<string>;
}
