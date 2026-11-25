import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { setupDocs } from '../src/docs';
import { FAKE_PROVIDER } from '../src/triage/triage.module';
import type { ModelProvider } from '../src/contracts';
import { KnowledgeBase } from '../src/retrieval/retriever';

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
        'retrieval',
        'route_reason',
        'sources',
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

  it('AC-K5/K6/K7 fake mode retrieves by keyword and the articles reach the model', async () => {
    const res = await request(app.getHttpServer())
      .post('/triage')
      .send({ subject: 'Double charge', body: 'I was charged twice, please refund the duplicate.' })
      .expect(200);
    expect(res.body.retrieval).toBe('keyword');
    expect(res.body.sources).toEqual(
      expect.arrayContaining(['Duplicate charges and failed payments']),
    );
    expect(res.body.sources.length).toBeLessThanOrEqual(3);
    // The fake provider mentions the first article it was given.
    expect(res.body.draft_reply).toContain(`See: ${res.body.sources[0]}.`);
  });

  it('AC-K5 returns empty sources when no article matches', async () => {
    const res = await request(app.getHttpServer())
      .post('/triage')
      .send({ subject: 'zzzz', body: 'qqqq xxxx' })
      .expect(200);
    expect(res.body).toMatchObject({ sources: [], retrieval: 'keyword' });
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

describe('POST /triage (e2e, embedding retrieval)', () => {
  const prev = process.env.TRIAGE_PROVIDER;
  afterAll(() => {
    if (prev === undefined) delete process.env.TRIAGE_PROVIDER;
    else process.env.TRIAGE_PROVIDER = prev;
  });

  it('AC-K3/K7 reports retrieval "embedding" and the top-ranked titles', async () => {
    process.env.TRIAGE_PROVIDER = 'fake';
    const articles = [
      { id: 'one', title: 'First article', text: 'alpha' },
      { id: 'two', title: 'Second article', text: 'beta' },
    ];
    // Document vectors are 2-d unit vectors; the query points at "Second article".
    const embedder = {
      embedDocuments: async () => [
        [1, 0],
        [0, 1],
      ],
      embedQuery: async () => [0.1, 0.9],
    };
    const kb = new KnowledgeBase(articles, embedder);
    await kb.init();
    const builder = Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(KnowledgeBase)
      .useValue(kb);
    const app = (await builder.compile()).createNestApplication();
    await app.init();
    const res = await request(app.getHttpServer())
      .post('/triage')
      .send({ subject: 'anything', body: 'any text' })
      .expect(200);
    expect(res.body.retrieval).toBe('embedding');
    expect(res.body.sources).toEqual(['Second article', 'First article']);
    await app.close();
  });
});
