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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const utility_service_1 = require("../utility/utility.service");
const jwt_1 = require("@nestjs/jwt");
const refresh_jwt_config_1 = require("../config/refresh.jwt.config");
const admin_service_1 = require("../user/service/admin.service");
const worker_service_1 = require("../user/service/worker.service");
const user_session_service_1 = require("../user/service/user-session.service");
const user_type_1 = require("../user/enums/user-type");
let AuthService = AuthService_1 = class AuthService {
    constructor(jwtService, workerService, adminService, utilityService, userSessionService, jwtRefreshConfig) {
        this.jwtService = jwtService;
        this.workerService = workerService;
        this.adminService = adminService;
        this.utilityService = utilityService;
        this.userSessionService = userSessionService;
        this.jwtRefreshConfig = jwtRefreshConfig;
        this.logger = new common_1.Logger(AuthService_1.name);
    }
    async validateUser(email, password, userType) {
        this.logger.log(`Validating ${userType} user with email: ${email}`);
        const user = await this.getUser(userType, email);
        if (!user)
            throw new common_1.UnauthorizedException('Invalid email address');
        const passwordMatches = await this.utilityService.verifyHashedValue(password, user.password);
        if (!passwordMatches)
            throw new common_1.UnauthorizedException('Invalid password provided');
        return { id: user.id, role: user.getType() };
    }
    async login(user, userType) {
        return await this.generateTokensAndUpdateUser(user.id, userType);
    }
    async refreshToken(user, userType) {
        return await this.generateTokensAndUpdateUser(user.id, userType);
    }
    async logout(user, userType) {
        await this.userSessionService.updateUserLogout(user.id, userType);
    }
    async validateRefreshToken(userId, userType, refreshToken) {
        const hashedUserRefreshToken = await this.userSessionService.getHashedUserRefreshToken(userId, userType);
        if (!hashedUserRefreshToken) {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        const isValid = await this.utilityService.verifyHashedValue(refreshToken, hashedUserRefreshToken);
        if (!isValid) {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        return { id: userId, role: userType };
    }
    async validateAccessToken(userId, userType) {
        const hashedUserRefreshToken = await this.userSessionService.getHashedUserRefreshToken(userId, userType);
        if (!hashedUserRefreshToken)
            throw new common_1.UnauthorizedException('Invalid authorization token');
        return { id: userId, role: userType };
    }
    async getLoggedInUser(user, userType) {
        if (userType == user_type_1.UserType.WORKER) {
            return this.workerService.get(user.id);
        }
        else {
            return this.adminService.get(user.id);
        }
    }
    async changeUserPassword(user, userType, changePasswordDto) {
        if (userType === user_type_1.UserType.WORKER) {
            return this.workerService.changePassword(user.id, changePasswordDto);
        }
        else {
            return this.adminService.changePassword(user.id, changePasswordDto);
        }
    }
    async generateTokensAndUpdateUser(userId, userType) {
        const payload = { sub: userId, role: userType };
        const access_token = await this.getAccessToken(payload);
        if (userType === user_type_1.UserType.WORKER) {
            return { access_token };
        }
        const refresh_token = await this.getRefreshToken(payload);
        const hashedRefreshToken = await this.utilityService.hashValue(refresh_token);
        await this.userSessionService.updateUserLogin(userId, userType, hashedRefreshToken);
        return { access_token, refresh_token };
    }
    async getRefreshToken(payload) {
        return await this.jwtService.signAsync(payload, this.jwtRefreshConfig);
    }
    async getAccessToken(payload) {
        return await this.jwtService.signAsync(payload);
    }
    async getUser(userType, email) {
        if (userType === user_type_1.UserType.ADMIN) {
            return await this.adminService.findByEmail(email);
        }
        return await this.workerService.findByEmail(email);
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(5, (0, common_1.Inject)(refresh_jwt_config_1.default.KEY)),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        worker_service_1.WorkerService,
        admin_service_1.AdminService,
        utility_service_1.UtilityService,
        user_session_service_1.UserSessionService, void 0])
], AuthService);
//# sourceMappingURL=auth.service.js.map