import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './utility/filters/http-exception.filter';
import { TransformInterceptor } from './utility/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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

bootstrap();
