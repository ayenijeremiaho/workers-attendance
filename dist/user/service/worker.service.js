"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var WorkerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const utility_service_1 = require("../../utility/utility.service");
const worker_entity_1 = require("../entity/worker.entity");
const department_entity_1 = require("../../department/entity/department.entity");
let WorkerService = WorkerService_1 = class WorkerService {
    constructor(workerRepository, departmentRepository, utilityService) {
        this.workerRepository = workerRepository;
        this.departmentRepository = departmentRepository;
        this.utilityService = utilityService;
        this.logger = new common_1.Logger(WorkerService_1.name);
    }
    async create(createWorkerDto) {
        const alreadyExist = await this.alreadyExist(createWorkerDto.email);
        if (alreadyExist) {
            this.logger.error(`Worker with the provided email ${createWorkerDto.email} already exist`);
            throw new common_1.BadRequestException('Worker with the provided email already exist');
        }
        const department = await this.departmentRepository.findOneBy({
            id: createWorkerDto.departmentId,
        });
        if (!department) {
            this.logger.error('Department not found');
            throw new common_1.NotFoundException('Department not found');
        }
        const unEncryptedPassword = `${createWorkerDto.lastname}`;
        const password = await this.utilityService.hashValue(unEncryptedPassword);
        const createWorker = {
            ...createWorkerDto,
            department: department,
            password: `${password}`,
        };
        const worker = await this.workerRepository.save(createWorker);
        this.logger.log('worker created successfully');
        this.utilityService.sendEmail(createWorkerDto.email, 'Worker Account Created', `Your account has been created successfully. Your password is ${unEncryptedPassword}`);
        return worker;
    }
    async update(id, updateWorkerDto) {
        let worker = await this.findById(id);
        await this.verifyIfEmailUpdate(worker, updateWorkerDto.email);
        await this.verifyIfDepartmentUpdate(worker, updateWorkerDto.departmentId);
        if (updateWorkerDto.lastname) {
            worker.lastname = updateWorkerDto.lastname;
        }
        if (updateWorkerDto.firstname) {
            worker.firstname = updateWorkerDto.firstname;
        }
        if (updateWorkerDto.phoneNumber) {
            worker.phoneNumber = updateWorkerDto.phoneNumber;
        }
        worker = await this.workerRepository.save(worker);
        this.utilityService.sendEmail(updateWorkerDto.email, 'Worker Account Updated', `Your account has been updated successfully`);
        return worker;
    }
    async get(id) {
        return await this.workerRepository.findOne({
            where: { id },
            relations: ['department'],
        });
    }
    async resetPassword(id) {
        const worker = await this.findById(id);
        if (!worker) {
            throw new common_1.NotFoundException('Worker not found');
        }
        const newPassword = this.generateRandomPassword();
        worker.password = await this.utilityService.hashValue(newPassword);
        worker.changedPassword = true;
        await this.workerRepository.save(worker);
        this.utilityService.sendEmail(worker.email, 'Password Reset', `Your password has been reset. Your new password is ${newPassword}`);
        this.logger.log(`Password reset for worker with email ${worker.email}`);
        return 'Password reset successfully';
    }
    async changePassword(id, changePasswordDto) {
        const worker = await this.findById(id);
        if (!worker) {
            throw new common_1.NotFoundException('Worker not found');
        }
        const isOldPasswordValid = await this.utilityService.verifyHashedValue(changePasswordDto.oldPassword, worker.password);
        if (!isOldPasswordValid) {
            throw new common_1.BadRequestException('Old password is incorrect');
        }
        if (changePasswordDto.newPassword !== changePasswordDto.confirmPassword) {
            throw new common_1.BadRequestException('New password and confirm password do not match');
        }
        worker.changedPassword = true;
        worker.password = await this.utilityService.hashValue(changePasswordDto.newPassword);
        await this.workerRepository.save(worker);
        this.utilityService.sendEmail(worker.email, 'Password Changed', `Your password has been changed successfully.`);
        this.logger.log(`Password changed for worker with email ${worker.email}`);
        return 'Password changed successfully';
    }
    generateRandomPassword() {
        return Math.random().toString(36).slice(-8);
    }
    async verifyIfDepartmentUpdate(worker, newDepartmentId) {
        if (newDepartmentId && newDepartmentId != worker.department.id) {
            const department = await this.departmentRepository.findOneBy({
                id: newDepartmentId,
            });
            if (!department) {
                throw new common_1.NotFoundException('Department not found');
            }
            worker.department = department;
        }
    }
    async verifyIfEmailUpdate(worker, newEmail) {
        if (!worker) {
            throw new common_1.NotFoundException('Worker not found');
        }
        if (newEmail && newEmail != worker.email) {
            const alreadyExist = await this.alreadyExist(newEmail);
            if (alreadyExist) {
                throw new common_1.BadRequestException('Worker with the provided email already exist');
            }
            worker.email = newEmail;
        }
    }
    async getByEmail(email) {
        const worker = await this.findByEmail(email);
        if (!worker) {
            throw new common_1.NotFoundException('Worker with the provided email does not exist');
        }
        else {
            return worker;
        }
    }
    async findById(id) {
        return await this.workerRepository.findOneBy({ id });
    }
    async findByEmail(email) {
        return await this.workerRepository.findOne({ where: { email } });
    }
    async alreadyExist(email) {
        return this.workerRepository.exists({ where: { email: email } });
    }
};
exports.WorkerService = WorkerService;
exports.WorkerService = WorkerService = WorkerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(worker_entity_1.Worker)),
    __param(1, (0, typeorm_1.InjectRepository)(department_entity_1.Department)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        utility_service_1.UtilityService])
], WorkerService);
//# sourceMappingURL=worker.service.js.map