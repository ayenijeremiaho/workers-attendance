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
var DepartmentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DepartmentService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const department_entity_1 = require("../entity/department.entity");
let DepartmentService = DepartmentService_1 = class DepartmentService {
    constructor(departmentRepository) {
        this.departmentRepository = departmentRepository;
        this.logger = new common_1.Logger(DepartmentService_1.name);
    }
    async create(createDepartmentDto) {
        await this.validateDepartmentIsValid(createDepartmentDto.name);
        const department = { ...createDepartmentDto };
        return this.departmentRepository.save(department);
    }
    async getOne(id) {
        const department = await this.departmentRepository.findOneBy({
            id: id,
        });
        if (!department) {
            this.logger.error('Department not found');
            throw new common_1.NotFoundException('Department not found');
        }
        return department;
    }
    async getAll(page = 1, limit = 10) {
        if (page < 1) {
            throw new common_1.BadRequestException('Page number must be greater than 0');
        }
        const [departments, total] = await this.departmentRepository.findAndCount({
            skip: (page - 1) * limit,
            take: limit,
            order: { createdAt: 'DESC' },
        });
        return {
            data: departments,
            page,
            limit,
            totalCount: total,
            totalPages: Math.ceil(total / limit),
        };
    }
    async update(id, updateDepartmentDto) {
        const department = await this.departmentRepository.findOne({
            where: { id },
        });
        if (!department) {
            this.logger.error('Department not found');
            throw new common_1.NotFoundException('Department not found');
        }
        let changesMade = false;
        if (updateDepartmentDto.name &&
            updateDepartmentDto.name != department.name) {
            await this.validateDepartmentIsValid(updateDepartmentDto.name);
            department.name = updateDepartmentDto.name;
            changesMade = true;
        }
        if (updateDepartmentDto.description) {
            department.description = updateDepartmentDto.description;
            changesMade = true;
        }
        if (changesMade) {
            return this.departmentRepository.save(department);
        }
        return department;
    }
    async delete(id) {
        const department = await this.departmentRepository.findOne({
            where: { id },
        });
        if (!department) {
            this.logger.error('Department not found');
            throw new common_1.NotFoundException('Department not found');
        }
        const isAttachedToWorker = await this.isAttachedToWorker(id);
        if (isAttachedToWorker) {
            this.logger.error('Department is attached to a worker');
            throw new common_1.BadRequestException('Department is attached to a worker, cannot be deleted');
        }
        await this.departmentRepository.delete(id);
    }
    isAttachedToWorker(departmentId) {
        this.logger.log('Checking if department is attached to a worker');
        return this.departmentRepository
            .createQueryBuilder('worker')
            .where('worker.department = :departmentId', { departmentId })
            .limit(1)
            .getExists();
    }
    async validateDepartmentIsValid(name) {
        const isExist = await this.departmentRepository.existsBy({ name: name });
        if (isExist) {
            this.logger.error('Department with the provided name already exist');
            throw new common_1.BadRequestException('Department with the provided name already exist');
        }
    }
};
exports.DepartmentService = DepartmentService;
exports.DepartmentService = DepartmentService = DepartmentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(department_entity_1.Department)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], DepartmentService);
//# sourceMappingURL=department.service.js.map