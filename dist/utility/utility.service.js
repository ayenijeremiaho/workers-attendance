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
var UtilityService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UtilityService = void 0;
const common_1 = require("@nestjs/common");
const nodemailer = require("nodemailer");
const argon2 = require("argon2");
const config_1 = require("@nestjs/config");
let UtilityService = UtilityService_1 = class UtilityService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(UtilityService_1.name);
    }
    async hashValue(value) {
        return await argon2.hash(value);
    }
    async verifyHashedValue(value, hashedValue) {
        return await argon2.verify(hashedValue, value);
    }
    sendEmail(to, subject, body) {
        const mailOptions = {
            from: this.configService.get('EMAIL_USER'),
            to,
            subject,
            html: body,
        };
        this.getMailTransport()
            .sendMail(mailOptions)
            .then(() => {
            this.logger.log(`SENT ${subject} EMAIL TO ${to}`);
        })
            .catch((error) => {
            this.logger.error(`ERROR SENDING ${subject} EMAIL TO ${to}`, error);
        });
    }
    getMailTransport() {
        return nodemailer.createTransport({
            host: this.configService.get('EMAIL_HOST'),
            port: this.configService.get('EMAIL_PORT'),
            secure: this.configService.get('EMAIL_SECURE'),
            service: this.configService.get('EMAIL_SERVICE'),
            auth: {
                user: this.configService.get('EMAIL_USER'),
                pass: this.configService.get('EMAIL_PASSWORD'),
            },
        });
    }
};
exports.UtilityService = UtilityService;
exports.UtilityService = UtilityService = UtilityService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], UtilityService);
//# sourceMappingURL=utility.service.js.map