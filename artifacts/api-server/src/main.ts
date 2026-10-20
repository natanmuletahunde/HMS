import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { requireSessionSecret } from './common/config/runtime-secrets';
import { RedisIoAdapter } from './gateways/redis-io.adapter';
import helmet from 'helmet';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const compression = require('compression');

async function bootstrap() {
  // Validate critical JWT/MFA key material before creating any application services.
  requireSessionSecret();
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] });

  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    const redisAdapter = new RedisIoAdapter(app);
    await redisAdapter.connect(redisUrl);
    app.useWebSocketAdapter(redisAdapter);
  } else if (process.env.NODE_ENV === 'production') {
    throw new Error('REDIS_URL is required in production for cross-replica Socket.IO delivery');
  }

  app.use(helmet());
  app.use(compression());
  app.enableCors({ origin: true, credentials: true });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false }),
  );

  const config = new DocumentBuilder()
    .setTitle('Nexus HMS API')
    .setDescription('Enterprise Hotel Management System REST API')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 8080;
  await app.listen(port);
  console.log(`NestJS API listening on port ${port}`);
}

bootstrap();
