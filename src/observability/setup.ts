import type { INestApplication } from '@nestjs/common';
import { Logger } from 'nestjs-pino';

/** Routes Nest's own logging through pino (the app is created with `bufferLogs: true`). */
export function setupObservability(app: INestApplication): void {
  app.useLogger(app.get(Logger));
}
