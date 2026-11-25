import { Injectable } from '@nestjs/common';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { type AttrValue, type SpanHandle, Telemetry } from './telemetry';

const TRACER_NAME = 'ticket-triage';

/**
 * OpenTelemetry-backed `Telemetry`. Nested `span()` calls become parent/child spans via the
 * active context.
 *
 * Privacy: never pass ticket content as an attribute. On failure only the error class name is
 * recorded, because error messages can echo ticket or model text.
 */
@Injectable()
export class TelemetryService extends Telemetry {
  span<T>(
    name: string,
    attributes: Record<string, AttrValue>,
    fn: (span: SpanHandle) => Promise<T>,
  ): Promise<T> {
    return trace.getTracer(TRACER_NAME).startActiveSpan(name, { attributes }, async (span) => {
      const handle: SpanHandle = {
        setAttributes: (attrs) => {
          span.setAttributes(attrs);
        },
      };
      try {
        return await fn(handle);
      } catch (err) {
        const errorType = err instanceof Error ? err.name : 'UnknownError';
        span.setAttribute('error.type', errorType);
        span.setStatus({ code: SpanStatusCode.ERROR, message: errorType });
        throw err;
      } finally {
        span.end();
      }
    });
  }
}
