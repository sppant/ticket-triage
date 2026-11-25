import './observability/tracing';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupDocs } from './docs';
import { setupObservability } from './observability/setup';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  setupObservability(app);
  setupDocs(app);
  app.enableCors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000' });
  await app.listen(Number(process.env.PORT ?? 3001));
}

void bootstrap();
