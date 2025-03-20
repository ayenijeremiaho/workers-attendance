"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DepartmentModule = void 0;
const common_1 = require("@nestjs/common");
const department_controller_1 = require("./controller/department.controller");
const department_service_1 = require("./service/department.service");
const typeorm_1 = require("@nestjs/typeorm");
const worker_entity_1 = require("../user/entity/worker.entity");
const department_entity_1 = require("./entity/department.entity");
let DepartmentModule = class DepartmentModule {
};
exports.DepartmentModule = DepartmentModule;
exports.DepartmentModule = DepartmentModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([department_entity_1.Department, worker_entity_1.Worker])],
        controllers: [department_controller_1.DepartmentController],
        providers: [department_service_1.DepartmentService],
    })
], DepartmentModule);
//# sourceMappingURL=department.module.js.map