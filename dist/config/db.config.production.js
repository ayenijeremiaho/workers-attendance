"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const process = require("node:process");
const path = require("node:path");
exports.default = () => ({
    type: 'postgres',
    host: process.env.DATABASE_HOST,
    port: +process.env.DARTABASE_PORT,
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    entities: [path.resolve(__dirname, '..') + '/**/*.entity{.ts,.js}'],
    logging: true,
});
//# sourceMappingURL=db.config.production.js.map