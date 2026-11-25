import { BatchSpanProcessor, SimpleSpanProcessor } from '@opentelemetry/sdk-trace';
import { createSpanProcessor, createTracingConfig } from './tracing.config';

describe('tracing config (AC-O3)', () => {
  it('defaults to the console exporter and service name ticket-triage', () => {
    expect(createTracingConfig({})).toEqual({ serviceName: 'ticket-triage', exporter: 'console' });
    expect(createSpanProcessor(createTracingConfig({}))).toBeInstanceOf(SimpleSpanProcessor);
  });

  it('treats an empty endpoint as unset', () => {
    expect(createTracingConfig({ OTEL_EXPORTER_OTLP_ENDPOINT: '  ' }).exporter).toBe('console');
  });

  it('selects OTLP when OTEL_EXPORTER_OTLP_ENDPOINT is set', () => {
    const config = createTracingConfig({
      OTEL_EXPORTER_OTLP_ENDPOINT: 'http://localhost:4318',
      OTEL_SERVICE_NAME: 'svc',
    });
    expect(config).toEqual({ serviceName: 'svc', exporter: 'otlp' });
    expect(createSpanProcessor(config)).toBeInstanceOf(BatchSpanProcessor);
  });
});
