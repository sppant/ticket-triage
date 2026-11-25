import fixture from './__fixtures__/vectors.json';
import type { Embedder } from './embedder';
import { KnowledgeBase } from './retriever';

const articles = fixture.articles.map(({ id, title, text }) => ({ id, title, text }));
const vectorByText = new Map<string, number[]>([
  ...fixture.articles.map((a) => [`${a.title}\n${a.text}`, a.vector] as [string, number[]]),
  ...Object.values(fixture.queries).map((q) => [q.text, q.vector] as [string, number[]]),
]);

/** Embedder that returns precomputed vectors, so no model is needed. */
function fixtureEmbedder(overrides: Partial<Embedder> = {}): Embedder & {
  embedDocuments: jest.Mock;
  embedQuery: jest.Mock;
} {
  return {
    embedDocuments: jest.fn(async (texts: string[]) =>
      texts.map((t) => vectorByText.get(t) as number[]),
    ),
    embedQuery: jest.fn(async (t: string) => vectorByText.get(t) as number[]),
    ...overrides,
  } as never;
}

describe('KnowledgeBase retrieval', () => {
  it('AC-K3 returns the top 3 by cosine similarity, best first, mode "embedding"', async () => {
    const kb = new KnowledgeBase(articles, fixtureEmbedder());
    expect(await kb.init()).toBe(true);
    const r = await kb.retrieve(fixture.queries.billing.text);
    expect(r.mode).toBe('embedding');
    expect(r.articles.map((a) => a.id)).toEqual(['a-billing', 'a-mixed', 'a-bugs']);
    const account = await kb.retrieve(fixture.queries.account.text);
    expect(account.articles[0]?.id).toBe('a-account');
    expect(account.articles).toHaveLength(3);
  });

  it('AC-K4 embeds the articles once and keeps the vectors in memory', async () => {
    const embedder = fixtureEmbedder();
    const kb = new KnowledgeBase(articles, embedder);
    await Promise.all([kb.init(), kb.init()]);
    await kb.retrieve(fixture.queries.billing.text);
    await kb.retrieve(fixture.queries.account.text);
    expect(embedder.embedDocuments).toHaveBeenCalledTimes(1);
    expect(kb.ready).toBe(true);
  });

  it('AC-K5 falls back to keyword search when there is no embedder', async () => {
    const kb = new KnowledgeBase(articles);
    expect(await kb.init()).toBe(false);
    const r = await kb.retrieve('refund for a charge');
    expect(r.mode).toBe('keyword');
    expect(r.articles.map((a) => a.id)).toEqual(['a-billing']);
  });

  it('AC-K5 falls back when indexing fails, and still succeeds', async () => {
    const embedder = fixtureEmbedder({
      embedDocuments: jest.fn().mockRejectedValue(new Error('down')),
    });
    const kb = new KnowledgeBase(articles, embedder);
    expect(await kb.init()).toBe(false);
    const r = await kb.retrieve('crash on export');
    expect(r.mode).toBe('keyword');
    expect(r.articles[0]?.id).toBe('a-bugs');
  });

  it('AC-K5 falls back for a single request when the query cannot be embedded', async () => {
    const embedder = fixtureEmbedder();
    const kb = new KnowledgeBase(articles, embedder);
    await kb.init();
    embedder.embedQuery.mockRejectedValueOnce(new Error('timeout'));
    expect((await kb.retrieve('refund charge')).mode).toBe('keyword');
    expect((await kb.retrieve(fixture.queries.billing.text)).mode).toBe('embedding');
  });

  it('AC-K5 builds the index on a later request if startup failed', async () => {
    const embedder = fixtureEmbedder();
    embedder.embedDocuments.mockRejectedValueOnce(new Error('not up yet'));
    const kb = new KnowledgeBase(articles, embedder);
    expect(await kb.init()).toBe(false);
    const r = await kb.retrieve(fixture.queries.billing.text);
    expect(r.mode).toBe('embedding');
    expect(embedder.embedDocuments).toHaveBeenCalledTimes(2);
  });
});
