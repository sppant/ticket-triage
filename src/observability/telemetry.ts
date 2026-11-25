export type AttrValue = string | number | boolean;

export interface SpanHandle {
  setAttributes(attributes: Record<string, AttrValue>): void;
}

/**
 * Tracing seam used by the API. The real OpenTelemetry implementation lives in
 * `telemetry.service.ts` (unit C); API tests can use `NoopTelemetry`.
 */
export abstract class Telemetry {
  abstract span<T>(
    name: string,
    attributes: Record<string, AttrValue>,
    fn: (span: SpanHandle) => Promise<T>,
  ): Promise<T>;
}

export class NoopTelemetry extends Telemetry {
  span<T>(
    _name: string,
    _attributes: Record<string, AttrValue>,
    fn: (span: SpanHandle) => Promise<T>,
  ): Promise<T> {
    return fn({ setAttributes: () => undefined });
  }
}
