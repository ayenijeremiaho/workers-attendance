"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const process = require("node:process");
const config_1 = require("@nestjs/config");
exports.default = (0, config_1.registerAs)('jwt-config', () => ({
    secret: process.env.JWT_SECRET,
    signOptions: { expiresIn: process.env.JWT_EXPIRY_IN },
}));
//# sourceMappingURL=jwt.config.js.map