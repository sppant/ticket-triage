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
  { id: 't1', subject: 's', body: 'b', category: 'bug', priority: 'high' },
  { id: 't2', subject: 's', body: 'b', category: 'billing', priority: 'low' },
  { id: 't3', subject: 's', body: 'b', category: 'account', priority: 'medium' },
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
