import { Body, Controller, Logger, Module, Post, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace';
import type { NodeSDK } from '@opentelemetry/sdk-node';
import { Writable } from 'node:stream';
import request from 'supertest';
import { ObservabilityModule } from './observability.module';
import { setupObservability } from './setup';
import { Telemetry } from './telemetry';
import { createTracingSdk } from './tracing.config';
import { loggerParams } from './logging';
import { waitForSpans } from './test-utils';
import { LoggerModule } from 'nestjs-pino';
import { Global } from '@nestjs/common';
import { TelemetryService } from './telemetry.service';

const SENTINEL = 'SENTINEL-TICKET-TEXT';

@Controller('probe')
class ProbeController {
  private readonly logger = new Logger('Probe');
  constructor(private readonly telemetry: Telemetry) {}

  @Post()
  async probe(@Body() body: { subject: string; body: string }): Promise<{ ok: boolean }> {
    await this.telemetry.span('triage.request', {}, () =>
      this.telemetry.span(
        'model.call',
        { 'llm.provider': 'fake', 'llm.model': 'fake-1' },
        async (span) => {
          span.setAttributes({ 'llm.latency_ms': 1 });
          this.logger.log('handled a ticket');
        },
      ),
    );
    return { ok: body.body.length > 0 };
  }
}

@Module({ controllers: [ProbeController] })
class ProbeModule {}

describe('logging and spans never contain ticket content (AC-O4)', () => {
  const lines: string[] = [];
  const destination = new Writable({
    write(chunk: Buffer, _enc, cb) {
      lines.push(...chunk.toString().split('\n').filter(Boolean));
      cb();
    },
  });
  const exporter = new InMemorySpanExporter();
  let sdk: NodeSDK;
  let app: INestApplication;

  beforeAll(async () => {
    sdk = createTracingSdk({}, [new SimpleSpanProcessor({ exporter })]);
    sdk.start();

    // Same wiring as ObservabilityModule, but with a capturing log destination.
    @Global()
    @Module({
      imports: [LoggerModule.forRoot(loggerParams({ LOG_LEVEL: 'debug' }, destination))],
      providers: [{ provide: Telemetry, useClass: TelemetryService }],
      exports: [Telemetry],
    })
    class CapturingObservabilityModule {}

    const moduleRef = await Test.createTestingModule({
      imports: [CapturingObservabilityModule, ProbeModule],
    }).compile();
    app = moduleRef.createNestApplication({ bufferLogs: true });
    setupObservability(app);
    await app.init();
  });
  afterAll(async () => {
    await app.close();
    await sdk.shutdown();
  });

  it('keeps the sentinel out of every log line and span attribute', async () => {
    const res = await request(app.getHttpServer())
      .post('/probe?q=' + SENTINEL)
      .set('x-ticket', SENTINEL)
      .send({ subject: SENTINEL, body: `my card is ${SENTINEL}` })
      .expect(201);
    expect(res.body).toEqual({ ok: true });

    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(() => JSON.parse(line) as unknown).not.toThrow();
      expect(line).not.toContain(SENTINEL);
    }

    const requestLog = lines
      .map((l) => JSON.parse(l) as Record<string, unknown>)
      .find((l) => l.res !== undefined);
    expect(requestLog).toMatchObject({
      req: { method: 'POST', url: '/probe' },
      res: { statusCode: 201 },
    });
    expect(requestLog).toHaveProperty('responseTime');

    const spans = await waitForSpans(exporter, 2);
    expect(spans.map((s) => s.name).sort()).toEqual(['model.call', 'triage.request']);
    expect(JSON.stringify(spans.map((s) => s.attributes))).not.toContain(SENTINEL);
  });

  it('the real ObservabilityModule provides Telemetry and a logger', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ObservabilityModule],
    }).compile();
    expect(moduleRef.get(Telemetry)).toBeInstanceOf(TelemetryService);
    await moduleRef.close();
  });
});
