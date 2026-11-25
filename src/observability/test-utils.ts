import type { InMemorySpanExporter, ReadableSpan } from '@opentelemetry/sdk-trace';

/**
 * Span export is asynchronous (the SDK waits for resource detection), so tests poll the
 * in-memory exporter until the expected number of spans has arrived.
 */
export async function waitForSpans(
  exporter: InMemorySpanExporter,
  count: number,
  timeoutMs = 2000,
): Promise<ReadableSpan[]> {
  const deadline = Date.now() + timeoutMs;
  while (exporter.getFinishedSpans().length < count && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  return exporter.getFinishedSpans();
}
