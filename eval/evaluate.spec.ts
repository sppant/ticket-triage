import { evaluateRetrieval } from './retrieval';
import type { LabeledTicket } from './dataset';
import { evaluate, type EvalProvider } from './evaluate';
import { renderReport } from './report';
import { parseArgs } from './args';
import { checkAnthropic, checkFake, checkOllama, type FetchLike } from './availability';

const provider: EvalProvider = {
  id: 'ollama',
  model: 'llama3.2:1b',
  prices: { inputPerMTok: 0.1, outputPerMTok: 0.5 },
};

const tickets: LabeledTicket[] = [
  { id: 't1', subject: 's', body: 'b', category: 'bug', priority: 'high', article: 'a' },
  { id: 't2', subject: 's', body: 'b', category: 'billing', priority: 'low', article: 'a' },
  { id: 't3', subject: 's', body: 'b', category: 'account', priority: 'medium', article: 'a' },
];

describe('evaluate', () => {
  it('scores injected results and measures latency', async () => {
    const ev = await evaluate(
      provider,
      tickets,
      async (t) => {
        await new Promise((r) => setTimeout(r, 5));
        return {
          category: t.category,
          priority: 'high',
          inputTokens: 100,
          outputTokens: 10,
        };
      },
      () => undefined,
    );
    expect(ev.metrics.categoryAccuracy).toBe(1);
    expect(ev.metrics.priorityAccuracy).toBeCloseTo(1 / 3);
    expect(ev.metrics.avgLatencyMs).toBeGreaterThanOrEqual(4);
    expect(ev.metrics.costPer1000).toBeCloseTo((100 * 0.1 + 10 * 0.5) / 1000);
  });

  it('counts a throwing ticket as an error and incorrect (AC-E6)', async () => {
    const logs: string[] = [];
    const ev = await evaluate(
      provider,
      tickets,
      async (t) => {
        if (t.id === 't2') throw new Error('invalid model output');
        return { category: t.category, priority: t.priority };
      },
      (l) => logs.push(l),
    );
    expect(ev.metrics.errors).toBe(1);
    expect(ev.metrics.categoryAccuracy).toBeCloseTo(2 / 3);
    expect(ev.metrics.priorityAccuracy).toBeCloseTo(2 / 3);
    expect(ev.results[1]?.error).toBe('invalid model output');
    expect(logs).toHaveLength(3);
  });

  it('runs sequentially', async () => {
    let active = 0;
    let maxActive = 0;
    await evaluate(
      provider,
      tickets,
      async (t) => {
        active++;
        maxActive = Math.max(maxActive, active);
        await new Promise((r) => setTimeout(r, 1));
        active--;
        return { category: t.category, priority: t.priority };
      },
      () => undefined,
    );
    expect(maxActive).toBe(1);
  });
});

describe('renderReport (AC-E5)', () => {
  it('renders header, table row and skipped providers without numbers', async () => {
    const ev = await evaluate(
      provider,
      tickets,
      async (t) => ({ category: t.category, priority: t.priority }),
      () => undefined,
    );
    const md = renderReport({
      date: new Date('2026-01-02T03:04:05Z'),
      datasetSize: 3,
      evaluations: [ev],
      skipped: [{ id: 'anthropic', reason: 'ANTHROPIC_API_KEY is not set' }],
    });
    expect(md).toContain('2026-01-02T03:04:05.000Z');
    expect(md).toContain('llama3.2:1b');
    expect(md).toContain('Dataset size: 3 tickets');
    expect(md).toContain(
      '| Provider | Model | Category acc. | Priority acc. | Errors | Avg latency (ms) | Est. cost / 1,000 tickets (USD) |',
    );
    expect(md).toContain('| ollama | llama3.2:1b | 100.0% | 100.0% | 0 |');
    const skippedRow = md.split('\n').find((l) => l.startsWith('| anthropic'));
    expect(skippedRow).toBe(
      '| anthropic | - | skipped: ANTHROPIC_API_KEY is not set | - | - | - | - |',
    );
    expect(md).toContain('- anthropic: skipped: ANTHROPIC_API_KEY is not set');
  });

  it('renders when everything is skipped', () => {
    const md = renderReport({
      date: new Date(0),
      datasetSize: 40,
      evaluations: [],
      skipped: [{ id: 'ollama', reason: 'Ollama not reachable' }],
    });
    expect(md).toContain('Models: none');
    expect(md).not.toMatch(/\d+\.\d%/);
  });
});

describe('parseArgs', () => {
  it('parses flags', () => {
    expect(parseArgs(['--limit', '5', '--provider', 'fake'])).toEqual({
      limit: 5,
      provider: 'fake',
    });
    expect(parseArgs([])).toEqual({});
  });
  it('rejects bad input', () => {
    expect(() => parseArgs(['--limit', '0'])).toThrow();
    expect(() => parseArgs(['--provider', 'gpt'])).toThrow();
    expect(() => parseArgs(['--nope'])).toThrow();
  });
});

describe('availability', () => {
  const fetchOk =
    (body: unknown, ok = true): FetchLike =>
    async () => ({ ok, status: ok ? 200 : 500, json: async () => body });

  it('ollama available when the model is listed', async () => {
    const f = fetchOk({ models: [{ name: 'llama3.2:1b' }] });
    expect(await checkOllama('http://x', 'llama3.2:1b', f)).toEqual({ available: true });
  });
  it('ollama skipped when model missing, unreachable or bad status', async () => {
    const missing = await checkOllama('http://x', 'foo:1b', fetchOk({ models: [] }));
    expect(missing).toMatchObject({ available: false, reason: expect.stringContaining('foo:1b') });
    const down = await checkOllama('http://x', 'm', async () => {
      throw new Error('ECONNREFUSED');
    });
    expect(down).toMatchObject({
      available: false,
      reason: expect.stringContaining('not reachable'),
    });
    expect(await checkOllama('http://x', 'm', fetchOk({}, false))).toMatchObject({
      available: false,
    });
  });
  it('anthropic and fake depend on env', () => {
    expect(checkAnthropic({}).available).toBe(false);
    expect(checkAnthropic({ ANTHROPIC_API_KEY: 'k' }).available).toBe(true);
    expect(checkFake({}).available).toBe(false);
    expect(checkFake({ EVAL_INCLUDE_FAKE: '1' }).available).toBe(true);
  });
});

describe('evaluateRetrieval (AC-E7)', () => {
  const art = (id: string) => ({ id, title: id, text: id });
  const ts: LabeledTicket[] = [
    { id: 't1', subject: 'a', body: 'b', category: 'bug', priority: 'high', article: 'x' },
    { id: 't2', subject: 'a', body: 'b', category: 'bug', priority: 'high', article: 'y' },
    { id: 't3', subject: 'a', body: 'b', category: 'bug', priority: 'high', article: 'z' },
    { id: 't4', subject: 'a', body: 'b', category: 'bug', priority: 'high', article: 'x' },
  ];

  it('counts a hit when the expected article is anywhere in the top 3', async () => {
    const answers = [['x'], ['q', 'r', 'y'], ['q'], []];
    let i = 0;
    const r = await evaluateRetrieval(
      'keyword',
      async () => ({ articles: (answers[i++] ?? []).map(art), mode: 'keyword' as const }),
      ts,
    );
    expect(r.hits).toBe(2);
    expect(r.total).toBe(4);
    expect(r.hitRate).toBe(0.5);
    expect(r.misses.map((m) => m.id)).toEqual(['t3', 't4']);
    expect(r.misses[0]).toEqual({ id: 't3', expected: 'z', got: ['q'] });
  });

  it('counts tickets that fell back to keyword in embedding mode', async () => {
    const r = await evaluateRetrieval(
      'embedding',
      async () => ({ articles: [art('x')], mode: 'keyword' as const }),
      ts.slice(0, 1),
    );
    expect(r.fallbacks).toBe(1);
  });

  it('reports retrieval rows and skipped modes without numbers (AC-E5, AC-E7)', () => {
    const md = renderReport({
      date: new Date('2026-01-01T00:00:00Z'),
      datasetSize: 4,
      evaluations: [],
      skipped: [],
      retrieval: [
        {
          mode: 'keyword',
          total: 4,
          hits: 2,
          hitRate: 0.5,
          avgLatencyMs: 1.2,
          fallbacks: 0,
          misses: [],
        },
      ],
      retrievalSkipped: [{ id: 'embedding', reason: 'embedding model unavailable' }],
      providerRetrieval: 'keyword',
    });
    expect(md).toContain('| keyword | 50.0% | 2/4 | 1 |  |');
    expect(md).toContain('| embedding | skipped: embedding model unavailable | - | - | |');
    expect(md).toContain('Retrieval used by provider runs: keyword');
  });
});
