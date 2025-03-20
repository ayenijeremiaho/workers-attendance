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
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerDto = void 0;
const user_dto_1 = require("./user.dto");
const department_dto_1 = require("../../department/dto/department.dto");
const class_transformer_1 = require("class-transformer");
let WorkerDto = class WorkerDto extends user_dto_1.UserDto {
};
exports.WorkerDto = WorkerDto;
__decorate([
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", department_dto_1.DepartmentDto)
], WorkerDto.prototype, "department", void 0);
exports.WorkerDto = WorkerDto = __decorate([
    (0, class_transformer_1.Exclude)()
], WorkerDto);
//# sourceMappingURL=worker.dto.js.map