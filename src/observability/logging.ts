import type { DestinationStream } from 'pino';
import type { Params } from 'nestjs-pino';

/**
 * Logging policy: ticket content (subject, body, draft reply) must NEVER be logged, in any
 * form, at any level. Request logs therefore contain only method, path (no query string),
 * status code and response time. Bodies and headers are never serialized.
 */
export function loggerParams(
  env: Record<string, string | undefined> = process.env,
  destination?: DestinationStream,
): Params {
  const options: NonNullable<Extract<Params['pinoHttp'], { level?: unknown }>> = {
    level: env.LOG_LEVEL || 'info',
    redact: {
      paths: [
        'req.headers',
        'res.headers',
        'req.body',
        'res.body',
        'req.query',
        'req.params',
        'req.remoteAddress',
        'req.remotePort',
      ],
      remove: true,
    },
    serializers: {
      req: (req: { method?: string; url?: string }) => ({
        method: req.method,
        url: (req.url ?? '').split('?')[0],
      }),
      res: (res: { statusCode?: number }) => ({ statusCode: res.statusCode }),
    },
  };
  return { pinoHttp: destination ? [options, destination] : options };
}
