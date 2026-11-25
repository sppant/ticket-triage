import { SpanStatusCode } from '@opentelemetry/api';
import type { NodeSDK } from '@opentelemetry/sdk-node';
import { InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace';
import { createTracingSdk } from './tracing.config';
import { TelemetryService } from './telemetry.service';
import { waitForSpans } from './test-utils';

describe('TelemetryService', () => {
  const exporter = new InMemorySpanExporter();
  let sdk: NodeSDK;
  const telemetry = new TelemetryService();

  beforeAll(() => {
    sdk = createTracingSdk({}, [new SimpleSpanProcessor({ exporter })]);
    sdk.start();
  });
  afterAll(async () => {
    await sdk.shutdown();
  });
  beforeEach(() => exporter.reset());

  it('AC-O1/O2: triage.request has a model.call child with llm.* attributes', async () => {
    const result = await telemetry.span('triage.request', {}, () =>
      telemetry.span(
        'model.call',
        { 'llm.provider': 'fake', 'llm.model': 'fake-1' },
        async (span) => {
          span.setAttributes({
            'llm.latency_ms': 12,
            'llm.input_tokens': 30,
            'llm.output_tokens': 7,
          });
          return 'done';
        },
      ),
    );
    expect(result).toBe('done');

    const spans = await waitForSpans(exporter, 2);
    const parent = spans.find((s) => s.name === 'triage.request');
    const child = spans.find((s) => s.name === 'model.call');
    expect(parent).toBeDefined();
    expect(child).toBeDefined();
    expect(child?.parentSpanContext?.spanId).toBe(parent?.spanContext().spanId);
    expect(child?.spanContext().traceId).toBe(parent?.spanContext().traceId);
    expect(child?.attributes).toEqual({
      'llm.provider': 'fake',
      'llm.model': 'fake-1',
      'llm.latency_ms': 12,
      'llm.input_tokens': 30,
      'llm.output_tokens': 7,
    });
  });

  it('records only the error class on failure, re-throws, and ends the span', async () => {
    class ProviderDown extends Error {
      override name = 'ProviderDown';
    }
    await expect(
      telemetry.span('model.call', {}, async () => {
        throw new ProviderDown('SENTINEL-TICKET-TEXT leaked in message');
      }),
    ).rejects.toThrow(ProviderDown);

    const [span] = await waitForSpans(exporter, 1);
    expect(span?.status.code).toBe(SpanStatusCode.ERROR);
    expect(span?.status.message).toBe('ProviderDown');
    expect(span?.attributes['error.type']).toBe('ProviderDown');
    expect(span?.events).toHaveLength(0);
    expect(JSON.stringify([span?.attributes, span?.status, span?.events])).not.toContain(
      'SENTINEL-TICKET-TEXT',
    );
  });
});
