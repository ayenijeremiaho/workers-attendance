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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const admin_local_auth_guard_1 = require("./guard/admin-local-auth.guard");
const refresh_jwt_auth_guard_1 = require("./guard/refresh-jwt-auth.guard");
const public_decorator_1 = require("./decorator/public.decorator");
const user_type_1 = require("../user/enums/user-type");
const worker_local_auth_guard_1 = require("./guard/worker-local-auth.guard");
const roles_decorator_1 = require("./decorator/roles.decorator");
const roles_guard_1 = require("./guard/roles.guard");
const class_transformer_1 = require("class-transformer");
const worker_dto_1 = require("../user/dto/worker.dto");
const admin_dto_1 = require("../user/dto/admin.dto");
const user_change_password_dto_1 = require("../user/dto/user-change-password.dto");
let AuthController = class AuthController {
    constructor(authService) {
        this.authService = authService;
    }
    async adminLogin(req) {
        return this.authService.login(req.user, user_type_1.UserType.ADMIN);
    }
    async adminRefresh(req) {
        return this.authService.refreshToken(req.user, user_type_1.UserType.ADMIN);
    }
    async adminLogout(req) {
        await this.authService.logout(req.user, user_type_1.UserType.ADMIN);
    }
    async adminProfile(req) {
        const admin = await this.authService.getLoggedInUser(req.user, user_type_1.UserType.ADMIN);
        return (0, class_transformer_1.plainToClass)(admin_dto_1.AdminDto, admin);
    }
    async changeAdminPassword(req, changePasswordDto) {
        return this.authService.changeUserPassword(req.user, user_type_1.UserType.ADMIN, changePasswordDto);
    }
    async workerLogin(req) {
        return this.authService.login(req.user, user_type_1.UserType.WORKER);
    }
    async workerLogout(req) {
        await this.authService.logout(req.user, user_type_1.UserType.WORKER);
    }
    async workerProfile(req) {
        const worker = await this.authService.getLoggedInUser(req.user, user_type_1.UserType.WORKER);
        return (0, class_transformer_1.plainToClass)(worker_dto_1.WorkerDto, worker);
    }
    async changeWorkerPassword(req, changePasswordDto) {
        return this.authService.changeUserPassword(req.user, user_type_1.UserType.WORKER, changePasswordDto);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(admin_local_auth_guard_1.AdminLocalAuthGuard),
    (0, roles_decorator_1.Roles)(user_type_1.UserType.ADMIN),
    (0, common_1.Post)('/admin/login'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "adminLogin", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(refresh_jwt_auth_guard_1.RefreshJwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_type_1.UserType.ADMIN),
    (0, common_1.Post)('/admin/refresh'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "adminRefresh", null);
__decorate([
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_type_1.UserType.ADMIN),
    (0, common_1.Post)('/admin/logout'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "adminLogout", null);
__decorate([
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_type_1.UserType.ADMIN),
    (0, common_1.Get)('/admin/profile'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "adminProfile", null);
__decorate([
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_type_1.UserType.ADMIN),
    (0, common_1.Post)('/admin/change-password'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, user_change_password_dto_1.UserChangePasswordDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "changeAdminPassword", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(worker_local_auth_guard_1.WorkerLocalAuthGuard),
    (0, common_1.Post)('/worker/login'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "workerLogin", null);
__decorate([
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_type_1.UserType.WORKER),
    (0, common_1.Post)('/worker/logout'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "workerLogout", null);
__decorate([
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_type_1.UserType.WORKER),
    (0, common_1.Get)('/worker/profile'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "workerProfile", null);
__decorate([
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_type_1.UserType.WORKER),
    (0, common_1.Post)('/worker/change-password'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, user_change_password_dto_1.UserChangePasswordDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "changeWorkerPassword", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map