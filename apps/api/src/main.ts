import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const apiPrefix = process.env.API_PREFIX ?? 'api';
  const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:3000';
  const port = Number(process.env.PORT ?? 4000);
  const host =
    process.env.API_HOST ?? (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');

  app.setGlobalPrefix(apiPrefix);
  app.enableCors({
    origin: corsOrigin.split(',').map((origin) => origin.trim()),
    credentials: true,
  });

  await app.listen(port, host);
}

void bootstrap();
