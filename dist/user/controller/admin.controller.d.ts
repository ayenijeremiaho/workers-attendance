import { AdminService } from '../service/admin.service';
import { CreateAdminDto } from '../dto/create-admin.dto';
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
    create(createAdminDto: CreateAdminDto): Promise<string>;
}
