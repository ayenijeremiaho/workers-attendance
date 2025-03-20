"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const auth_controller_1 = require("./auth.controller");
const utility_service_1 = require("../utility/utility.service");
const admin_local_strategy_1 = require("./strategy/admin.local.strategy");
const typeorm_1 = require("@nestjs/typeorm");
const jwt_1 = require("@nestjs/jwt");
const jwt_config_1 = require("../config/jwt.config");
const config_1 = require("@nestjs/config");
const jwt_strategy_1 = require("./strategy/jwt.strategy");
const refresh_jwt_config_1 = require("../config/refresh.jwt.config");
const refresh_jwt_strategy_1 = require("./strategy/refresh.jwt.strategy");
const core_1 = require("@nestjs/core");
const jwt_auth_guard_1 = require("./guard/jwt-auth.guard");
const admin_entity_1 = require("../user/entity/admin.entity");
const worker_entity_1 = require("../user/entity/worker.entity");
const user_session_entity_1 = require("../user/entity/user-session.entity");
const user_session_service_1 = require("../user/service/user-session.service");
const admin_service_1 = require("../user/service/admin.service");
const worker_service_1 = require("../user/service/worker.service");
const worker_local_strategy_1 = require("./strategy/worker.local.strategy");
const department_entity_1 = require("../department/entity/department.entity");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([admin_entity_1.Admin, department_entity_1.Department, worker_entity_1.Worker, user_session_entity_1.UserSession]),
            jwt_1.JwtModule.registerAsync(jwt_config_1.default.asProvider()),
            config_1.ConfigModule.forFeature(jwt_config_1.default),
            config_1.ConfigModule.forFeature(refresh_jwt_config_1.default),
        ],
        controllers: [auth_controller_1.AuthController],
        providers: [
            auth_service_1.AuthService,
            admin_service_1.AdminService,
            worker_service_1.WorkerService,
            utility_service_1.UtilityService,
            admin_local_strategy_1.AdminLocalStrategy,
            worker_local_strategy_1.WorkerLocalStrategy,
            jwt_strategy_1.JwtStrategy,
            refresh_jwt_strategy_1.RefreshJwtStrategy,
            user_session_service_1.UserSessionService,
            {
                provide: core_1.APP_GUARD,
                useClass: jwt_auth_guard_1.JwtAuthGuard,
            },
        ],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map