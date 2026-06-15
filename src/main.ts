import {NestFactory} from '@nestjs/core';
import {IoAdapter} from '@nestjs/platform-socket.io';
import {AppModule} from './app.module';
import {Logger} from 'nestjs-pino';
import {INestApplication, VersioningType} from '@nestjs/common';
import {HttpExceptionFilter} from './utility/filters/http-exception.filter';
import {TransformInterceptor} from './utility/interceptors/transform.interceptor';
import {TrimValidationPipe} from './utility/pipes/trim-validation.pipe';
import helmet from 'helmet';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.use(helmet());
    app.useWebSocketAdapter(new IoAdapter(app));
    app.enableCors(corsOptions());
    app.enableVersioning({type: VersioningType.URI, defaultVersion: '1'});
    registerNestLogger(app);
    registerGlobalPipes(app);
    registerGlobalFilters(app);
    registerGlobalInterceptors(app);
    await app.listen(process.env.PORT ?? 3000);
}

function registerNestLogger(app: INestApplication) {
    app.useLogger(app.get(Logger));
}

function registerGlobalPipes(app: INestApplication) {
    app.useGlobalPipes(
        new TrimValidationPipe({whitelist: true, forbidNonWhitelisted: true, transform: true}),
    );
}

function registerGlobalFilters(app: INestApplication) {
    app.useGlobalFilters(new HttpExceptionFilter());
}

function registerGlobalInterceptors(app: INestApplication) {
    app.useGlobalInterceptors(new TransformInterceptor());
}

function corsOptions() {
    const origins = process.env.CORS_ORIGINS?.split(',');
    return {
        origin: origins,
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        credentials: true,
        preflightContinue: false,
    };
}

bootstrap();
