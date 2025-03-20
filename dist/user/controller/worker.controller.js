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
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerController = void 0;
const common_1 = require("@nestjs/common");
const create_worker_dto_1 = require("../dto/create-worker.dto");
const worker_service_1 = require("../service/worker.service");
const class_transformer_1 = require("class-transformer");
const worker_dto_1 = require("../dto/worker.dto");
const roles_guard_1 = require("../../auth/guard/roles.guard");
const roles_decorator_1 = require("../../auth/decorator/roles.decorator");
const user_type_1 = require("../enums/user-type");
let WorkerController = class WorkerController {
    constructor(workerService) {
        this.workerService = workerService;
    }
    async create(createWorkerDto) {
        const worker = await this.workerService.create(createWorkerDto);
        return (0, class_transformer_1.plainToClass)(worker_dto_1.WorkerDto, worker);
    }
    async update(id, updateWorkerDto) {
        const worker = await this.workerService.update(id, updateWorkerDto);
        return (0, class_transformer_1.plainToClass)(worker_dto_1.WorkerDto, worker);
    }
    async get(id) {
        const worker = await this.workerService.get(id);
        return (0, class_transformer_1.plainToClass)(worker_dto_1.WorkerDto, worker);
    }
    async resetPassword(id) {
        return await this.workerService.resetPassword(id);
    }
};
exports.WorkerController = WorkerController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_worker_dto_1.CreateWorkerDto]),
    __metadata("design:returntype", Promise)
], WorkerController.prototype, "create", null);
__decorate([
    (0, common_1.Put)('/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], WorkerController.prototype, "update", null);
__decorate([
    (0, common_1.Get)('/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WorkerController.prototype, "get", null);
__decorate([
    (0, common_1.Post)('reset-password/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WorkerController.prototype, "resetPassword", null);
exports.WorkerController = WorkerController = __decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_type_1.UserType.ADMIN),
    (0, common_1.Controller)('workers'),
    __metadata("design:paramtypes", [worker_service_1.WorkerService])
], WorkerController);
//# sourceMappingURL=worker.controller.js.map