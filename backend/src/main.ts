import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

// Fix: JSON.stringify does not support BigInt natively
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

import { DevicesGateway } from './devices/devices.gateway';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow <audio> to load streams
    crossOriginEmbedderPolicy: false,
  }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: true, // aceita qualquer origem na rede local
    credentials: true,
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);

  await app.listen(port, '0.0.0.0'); // escuta em todas as interfaces de rede
  // Start NTP-like clock broadcast
  app.get(DevicesGateway).startClockBroadcast();
  console.log(`Music streaming backend running on port ${port}`);
}

bootstrap();
