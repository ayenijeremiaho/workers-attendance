import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './utility/filters/http-exception.filter';
import { TransformInterceptor } from './utility/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(corsOptions());
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
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
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
