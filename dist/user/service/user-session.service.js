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
var UserSessionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserSessionService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const typeorm_2 = require("@nestjs/typeorm");
const user_session_entity_1 = require("../entity/user-session.entity");
let UserSessionService = UserSessionService_1 = class UserSessionService {
    constructor(userSessionRepository) {
        this.userSessionRepository = userSessionRepository;
        this.logger = new common_1.Logger(UserSessionService_1.name);
    }
    async updateUserLogin(userId, userType, hashedRefreshToken) {
        let userSession = await this.findUserSessionByUserId(userId, userType);
        if (userSession) {
            try {
                userSession.hashedRefreshToken = hashedRefreshToken;
                userSession.lastLogin = new Date();
                await this.userSessionRepository.save(userSession);
                this.logger.log(`Updated ${userType} - ${userId} session`);
            }
            catch (e) {
                this.logger.error("An error occurred while updating user's session", e);
            }
            return;
        }
        userSession = new user_session_entity_1.UserSession();
        userSession.userId = userId;
        userSession.userType = userType;
        userSession.hashedRefreshToken = hashedRefreshToken;
        userSession.lastLogin = new Date();
        await this.userSessionRepository.save(userSession);
        this.logger.log(`Created ${userType} - ${userId} session`);
    }
    async updateUserLogout(userId, userType) {
        const userSession = await this.findUserSessionByUserId(userId, userType);
        if (!userSession) {
            return;
        }
        userSession.hashedRefreshToken = null;
        userSession.lastLogout = new Date();
        await this.userSessionRepository.save(userSession);
    }
    async getHashedUserRefreshToken(userId, userType) {
        const userSession = await this.findUserSessionByUserId(userId, userType);
        if (!userSession) {
            return null;
        }
        return userSession.hashedRefreshToken;
    }
    async findUserSessionByUserId(userId, userType) {
        return await this.userSessionRepository.findOneBy({
            userId,
            userType,
        });
    }
};
exports.UserSessionService = UserSessionService;
exports.UserSessionService = UserSessionService = UserSessionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_2.InjectRepository)(user_session_entity_1.UserSession)),
    __metadata("design:paramtypes", [typeorm_1.Repository])
], UserSessionService);
//# sourceMappingURL=user-session.service.js.map