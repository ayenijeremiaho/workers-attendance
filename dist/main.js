"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const nestjs_pino_1 = require("nestjs-pino");
const common_1 = require("@nestjs/common");
const http_exception_filter_1 = require("./utility/filters/http-exception.filter");
const transform_interceptor_1 = require("./utility/interceptors/transform.interceptor");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    registerNestLogger(app);
    registerGlobalPipes(app);
    registerGlobalFilters(app);
    registerGlobalInterceptors(app);
    await app.listen(process.env.PORT ?? 3000);
}
function registerNestLogger(app) {
    app.useLogger(app.get(nestjs_pino_1.Logger));
}
function registerGlobalPipes(app) {
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
}
function registerGlobalFilters(app) {
    app.useGlobalFilters(new http_exception_filter_1.HttpExceptionFilter());
}
function registerGlobalInterceptors(app) {
    app.useGlobalInterceptors(new transform_interceptor_1.TransformInterceptor());
}
bootstrap();
//# sourceMappingURL=main.js.map