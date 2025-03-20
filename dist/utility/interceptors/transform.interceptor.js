"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransformInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
let TransformInterceptor = class TransformInterceptor {
    intercept(context, next) {
        const ctx = context.switchToHttp();
        const response = ctx.getResponse();
        const statusCode = response.statusCode;
        return next.handle().pipe((0, operators_1.map)((data) => {
            const responseData = data ?? {};
            const message = this.getDefaultMessage(statusCode);
            const finalMessage = responseData.message || message;
            const finalStatus = responseData.status || statusCode;
            if (responseData) {
                delete responseData.message;
                delete responseData.status;
            }
            return {
                data: responseData,
                status: finalStatus,
                message: finalMessage,
            };
        }));
    }
    getDefaultMessage(status) {
        switch (status) {
            case common_1.HttpStatus.OK:
                return 'Request successful';
            case common_1.HttpStatus.CREATED:
                return 'Resource created successfully';
            case common_1.HttpStatus.ACCEPTED:
                return 'Request accepted';
            case common_1.HttpStatus.NO_CONTENT:
                return 'Resource completed successfully';
            case common_1.HttpStatus.BAD_REQUEST:
                return 'Bad request';
            case common_1.HttpStatus.UNAUTHORIZED:
                return 'Unauthorized';
            case common_1.HttpStatus.FORBIDDEN:
                return 'Forbidden';
            case common_1.HttpStatus.NOT_FOUND:
                return 'Resource not found';
            case common_1.HttpStatus.INTERNAL_SERVER_ERROR:
                return 'Internal server error';
            default:
                return 'Request processed successfully';
        }
    }
};
exports.TransformInterceptor = TransformInterceptor;
exports.TransformInterceptor = TransformInterceptor = __decorate([
    (0, common_1.Injectable)()
], TransformInterceptor);
//# sourceMappingURL=transform.interceptor.js.map