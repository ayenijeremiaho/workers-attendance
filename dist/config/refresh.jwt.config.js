"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const process = require("node:process");
const config_1 = require("@nestjs/config");
exports.default = (0, config_1.registerAs)('refresh-jwt-config', () => ({
    secret: process.env.REFRESH_JWT_SECRET,
    expiresIn: process.env.REFRESH_JWT_EXPIRY_IN,
}));
//# sourceMappingURL=refresh.jwt.config.js.map