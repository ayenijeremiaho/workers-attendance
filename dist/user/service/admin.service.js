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
var AdminService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const utility_service_1 = require("../../utility/utility.service");
const admin_entity_1 = require("../entity/admin.entity");
let AdminService = AdminService_1 = class AdminService {
    constructor(adminRepository, utilityService) {
        this.adminRepository = adminRepository;
        this.utilityService = utilityService;
        this.logger = new common_1.Logger(AdminService_1.name);
    }
    async create(createAdminDto) {
        const alreadyExist = await this.alreadyExist(createAdminDto.email);
        if (alreadyExist) {
            this.logger.error('Admin with the provided email already exist');
            throw new common_1.BadRequestException('Admin with the provided email already exist');
        }
        let password = `${createAdminDto.lastname}`;
        password = await this.utilityService.hashValue(password);
        const createAdmin = {
            ...createAdminDto,
            password: `${password}`,
        };
        await this.adminRepository.save(createAdmin);
        this.logger.log(`Admin ${createAdmin.email} created successfully`);
        return 'success';
    }
    async getByEmail(email) {
        const admin = await this.findByEmail(email);
        if (!admin) {
            throw new common_1.NotFoundException('Admin with the provided email does not exist');
        }
        else {
            return admin;
        }
    }
    async get(id) {
        return await this.adminRepository.findOneBy({ id });
    }
    async update(id, data) {
        return await this.adminRepository.update(id, data);
    }
    async findByEmail(email) {
        return await this.adminRepository.findOne({ where: { email } });
    }
    async changePassword(id, changePasswordDto) {
        const admin = await this.get(id);
        if (!admin) {
            throw new common_1.NotFoundException('Admin not found');
        }
        const isOldPasswordValid = await this.utilityService.verifyHashedValue(changePasswordDto.oldPassword, admin.password);
        if (!isOldPasswordValid) {
            throw new common_1.BadRequestException('Old password is incorrect');
        }
        if (changePasswordDto.newPassword !== changePasswordDto.confirmPassword) {
            throw new common_1.BadRequestException('New password and confirm password do not match');
        }
        admin.changedPassword = true;
        admin.password = await this.utilityService.hashValue(changePasswordDto.newPassword);
        await this.adminRepository.save(admin);
        this.utilityService.sendEmail(admin.email, 'Password Changed', `Your password has been changed successfully.`);
        this.logger.log(`Password changed for admin with email ${admin.email}`);
        return 'Password changed successfully';
    }
    async alreadyExist(email) {
        return this.adminRepository.exists({ where: { email: email } });
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = AdminService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(admin_entity_1.Admin)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        utility_service_1.UtilityService])
], AdminService);
//# sourceMappingURL=admin.service.js.map