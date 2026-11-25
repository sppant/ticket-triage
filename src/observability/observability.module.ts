import { Global, Module } from '@nestjs/common';
import { NoopTelemetry, Telemetry } from './telemetry';

// Unit C replaces the NoopTelemetry binding with the OpenTelemetry implementation.
@Global()
@Module({
  providers: [{ provide: Telemetry, useClass: NoopTelemetry }],
  exports: [Telemetry],
})
export class ObservabilityModule {}
