import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  BatchSpanProcessor,
  ConsoleSpanExporter,
  SimpleSpanProcessor,
  type SpanProcessor,
} from '@opentelemetry/sdk-trace-base';

export type TracingEnv = Record<string, string | undefined>;

export interface TracingConfig {
  serviceName: string;
  exporter: 'console' | 'otlp';
}

export const DEFAULT_SERVICE_NAME = 'ticket-triage';

/** Pure decision: which exporter and service name the environment asks for (AC-O3). */
export function createTracingConfig(env: TracingEnv): TracingConfig {
  const endpoint = env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim();
  return {
    serviceName: env.OTEL_SERVICE_NAME?.trim() || DEFAULT_SERVICE_NAME,
    exporter: endpoint ? 'otlp' : 'console',
  };
}

/**
 * Builds the span processor for the configured exporter. `OTLPTraceExporter` is created
 * without an explicit URL so it follows the standard OTEL_EXPORTER_OTLP_* variables; for the
 * generic OTEL_EXPORTER_OTLP_ENDPOINT it appends `/v1/traces` itself.
 */
export function createSpanProcessor(config: TracingConfig): SpanProcessor {
  return config.exporter === 'otlp'
    ? new BatchSpanProcessor(new OTLPTraceExporter())
    : new SimpleSpanProcessor(new ConsoleSpanExporter());
}

/** Creates the SDK without starting it. `spanProcessors` can be overridden in tests. */
export function createTracingSdk(env: TracingEnv, spanProcessors?: SpanProcessor[]): NodeSDK {
  const config = createTracingConfig(env);
  return new NodeSDK({
    serviceName: config.serviceName,
    spanProcessors: spanProcessors ?? [createSpanProcessor(config)],
  });
}

/** Starts tracing and flushes/stops it on SIGTERM. Returns the running SDK. */
export function startTracing(env: TracingEnv): NodeSDK {
  const sdk = createTracingSdk(env);
  sdk.start();
  process.once('SIGTERM', () => {
    sdk.shutdown().catch((err: unknown) => {
      process.stderr.write(
        `tracing shutdown failed: ${err instanceof Error ? err.name : 'unknown error'}\n`,
      );
    });
  });
  return sdk;
}
