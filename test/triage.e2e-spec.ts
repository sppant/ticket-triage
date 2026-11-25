import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { setupDocs } from '../src/docs';
import { FAKE_PROVIDER } from '../src/triage/triage.module';
import type { ModelProvider } from '../src/contracts';

async function createApp(override?: ModelProvider): Promise<INestApplication> {
  let builder = Test.createTestingModule({ imports: [AppModule] });
  if (override) builder = builder.overrideProvider(FAKE_PROVIDER).useValue(override);
  const app = (await builder.compile()).createNestApplication();
  setupDocs(app);
  await app.init();
  return app;
}

describe('POST /triage (e2e, fake provider)', () => {
  let app: INestApplication;
  const prev = process.env.TRIAGE_PROVIDER;

  beforeAll(async () => {
    process.env.TRIAGE_PROVIDER = 'fake';
    app = await createApp();
  });
  afterAll(async () => {
    await app.close();
    if (prev === undefined) delete process.env.TRIAGE_PROVIDER;
    else process.env.TRIAGE_PROVIDER = prev;
  });

  it('AC-A1/A2/R6 returns the full response shape', async () => {
    const res = await request(app.getHttpServer())
      .post('/triage')
      .send({ subject: 'Double charge', body: 'I was charged twice, please refund. Urgent.' })
      .expect(200);
    expect(Object.keys(res.body).sort()).toEqual(
      [
        'category',
        'draft_reply',
        'latency_ms',
        'model',
        'priority',
        'provider',
        'route_reason',
      ].sort(),
    );
    expect(res.body).toMatchObject({
      category: 'billing',
      priority: 'high',
      model: 'fake-1',
      provider: 'fake',
      route_reason: 'fake provider: TRIAGE_PROVIDER=fake',
    });
    expect(res.body.draft_reply.length).toBeGreaterThan(0);
    expect(res.body.latency_ms).toBeGreaterThanOrEqual(0);
  });

  it.each([
    ['missing subject', { body: 'x' }],
    ['missing body', { subject: 'x' }],
    ['non-string subject', { subject: 5, body: 'x' }],
    ['empty subject', { subject: '', body: 'x' }],
    ['blank body', { subject: 'x', body: '   ' }],
    ['subject too long', { subject: 'a'.repeat(201), body: 'x' }],
    ['body too long', { subject: 'x', body: 'a'.repeat(5001) }],
  ])('AC-A3 returns 400 for %s', async (_n, payload) => {
    await request(app.getHttpServer()).post('/triage').send(payload).expect(400);
  });

  it('AC-A3 accepts the maximum lengths', async () => {
    await request(app.getHttpServer())
      .post('/triage')
      .send({ subject: 'a'.repeat(200), body: 'b'.repeat(5000) })
      .expect(200);
  });

  it('AC-A4 serves docs HTML and an OpenAPI document describing POST /triage', async () => {
    const html = await request(app.getHttpServer()).get('/docs').expect(200);
    expect(html.headers['content-type']).toContain('text/html');
    const json = await request(app.getHttpServer()).get('/docs-json').expect(200);
    expect(json.body.openapi).toMatch(/^3\./);
    expect(json.body.paths['/triage'].post).toBeDefined();
  });
});

describe('POST /triage failure paths (e2e)', () => {
  it('AC-V3 returns 502 with a message and no ticket text when output is invalid twice', async () => {
    const complete = jest.fn().mockResolvedValue({ text: 'garbage', model: 'bad' });
    const app = await createApp({ id: 'fake', model: 'bad', complete });
    const res = await request(app.getHttpServer())
      .post('/triage')
      .send({ subject: 'SENTINEL-SUBJECT', body: 'SENTINEL-BODY' })
      .expect(502);
    expect(complete).toHaveBeenCalledTimes(2);
    expect(typeof res.body.message).toBe('string');
    expect(JSON.stringify(res.body)).not.toContain('SENTINEL');
    await app.close();
  });

  it('AC-V3 returns 502 when the provider throws', async () => {
    const complete = jest.fn().mockRejectedValue(new Error('SENTINEL-BODY down'));
    const app = await createApp({ id: 'fake', model: 'bad', complete });
    const res = await request(app.getHttpServer())
      .post('/triage')
      .send({ subject: 's', body: 'b' })
      .expect(502);
    expect(JSON.stringify(res.body)).not.toContain('SENTINEL');
    await app.close();
  });
});
