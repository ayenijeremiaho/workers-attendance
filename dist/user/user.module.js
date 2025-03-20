"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModule = void 0;
const common_1 = require("@nestjs/common");
const admin_controller_1 = require("./controller/admin.controller");
const admin_service_1 = require("./service/admin.service");
const typeorm_1 = require("@nestjs/typeorm");
const admin_entity_1 = require("./entity/admin.entity");
const utility_service_1 = require("../utility/utility.service");
const worker_controller_1 = require("./controller/worker.controller");
const worker_entity_1 = require("./entity/worker.entity");
const worker_service_1 = require("./service/worker.service");
const department_entity_1 = require("../department/entity/department.entity");
let UserModule = class UserModule {
};
exports.UserModule = UserModule;
exports.UserModule = UserModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([admin_entity_1.Admin, worker_entity_1.Worker, department_entity_1.Department])],
        controllers: [admin_controller_1.AdminController, worker_controller_1.WorkerController],
        providers: [admin_service_1.AdminService, worker_service_1.WorkerService, utility_service_1.UtilityService],
    })
], UserModule);
//# sourceMappingURL=user.module.js.map