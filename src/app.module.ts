import { Module } from '@nestjs/common';
import { ObservabilityModule } from './observability/observability.module';
import { TriageModule } from './triage/triage.module';

@Module({ imports: [ObservabilityModule, TriageModule] })
export class AppModule {}
