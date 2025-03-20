import { Repository } from 'typeorm';
import { UtilityService } from '../../utility/utility.service';
import { CreateWorkerDto } from '../dto/create-worker.dto';
import { Worker } from '../entity/worker.entity';
import { Department } from '../../department/entity/department.entity';
import { UpdateWorkerDto } from '../dto/update-worker.dto';
import { UserChangePasswordDto } from '../dto/user-change-password.dto';
export declare class WorkerService {
    private readonly workerRepository;
    private readonly departmentRepository;
    private readonly utilityService;
    private readonly logger;
    constructor(workerRepository: Repository<Worker>, departmentRepository: Repository<Department>, utilityService: UtilityService);
    create(createWorkerDto: CreateWorkerDto): Promise<Worker>;
    update(id: string, updateWorkerDto: UpdateWorkerDto): Promise<Worker>;
    get(id: string): Promise<Worker>;
    resetPassword(id: string): Promise<string>;
    changePassword(id: string, changePasswordDto: UserChangePasswordDto): Promise<string>;
    private generateRandomPassword;
    private verifyIfDepartmentUpdate;
    private verifyIfEmailUpdate;
    getByEmail(email: string): Promise<Worker>;
    findById(id: string): Promise<Worker>;
    findByEmail(email: string): Promise<Worker>;
    private alreadyExist;
}
