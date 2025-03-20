"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Admin = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./user.entity");
const user_type_1 = require("../enums/user-type");
let Admin = class Admin extends user_entity_1.User {
    getType() {
        return user_type_1.UserType.ADMIN;
    }
};
exports.Admin = Admin;
exports.Admin = Admin = __decorate([
    (0, typeorm_1.Entity)({ name: 'admins' })
], Admin);
//# sourceMappingURL=admin.entity.js.map