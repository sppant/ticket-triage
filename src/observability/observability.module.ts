import { Global, Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { loggerParams } from './logging';
import { Telemetry } from './telemetry';
import { TelemetryService } from './telemetry.service';

@Global()
@Module({
  imports: [LoggerModule.forRoot(loggerParams())],
  providers: [{ provide: Telemetry, useClass: TelemetryService }],
  exports: [Telemetry],
})
export class ObservabilityModule {}
