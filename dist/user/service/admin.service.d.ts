import { Repository } from 'typeorm';
import { CreateAdminDto } from '../dto/create-admin.dto';
import { UtilityService } from '../../utility/utility.service';
import { Admin } from '../entity/admin.entity';
import { UserChangePasswordDto } from '../dto/user-change-password.dto';
export declare class AdminService {
    private readonly adminRepository;
    private readonly utilityService;
    private readonly logger;
    constructor(adminRepository: Repository<Admin>, utilityService: UtilityService);
    create(createAdminDto: CreateAdminDto): Promise<string>;
    getByEmail(email: string): Promise<Admin>;
    get(id: string): Promise<Admin>;
    update(id: string, data: Partial<Admin>): Promise<import("typeorm").UpdateResult>;
    findByEmail(email: string): Promise<Admin>;
    changePassword(id: string, changePasswordDto: UserChangePasswordDto): Promise<string>;
    private alreadyExist;
}
