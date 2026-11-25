import {
  anthropicPrices,
  computeMetrics,
  costPer1000,
  DEFAULT_ANTHROPIC_INPUT_PER_MTOK,
  DEFAULT_ANTHROPIC_OUTPUT_PER_MTOK,
  ZERO_PRICES,
  type TicketResult,
} from './metrics';

const result = (over: Partial<TicketResult>): TicketResult => ({
  id: 'x',
  expected: { category: 'bug', priority: 'high' },
  predicted: { category: 'bug', priority: 'high' },
  latencyMs: 100,
  ...over,
});

describe('computeMetrics', () => {
  it('computes accuracy per field separately (AC-E3)', () => {
    const m = computeMetrics(
      [
        result({}),
        result({ predicted: { category: 'bug', priority: 'low' } }),
        result({ predicted: { category: 'billing', priority: 'high' } }),
        result({ predicted: { category: 'billing', priority: 'low' } }),
      ],
      ZERO_PRICES,
    );
    expect(m.categoryAccuracy).toBe(0.5);
    expect(m.priorityAccuracy).toBe(0.5);
    expect(m.errors).toBe(0);
  });

  it('counts errors as incorrect for both fields (AC-E6)', () => {
    const m = computeMetrics(
      [result({}), result({ predicted: undefined, error: 'invalid' })],
      ZERO_PRICES,
    );
    expect(m.errors).toBe(1);
    expect(m.categoryAccuracy).toBe(0.5);
    expect(m.priorityAccuracy).toBe(0.5);
  });

  it('averages latency and tokens, ignoring missing token counts', () => {
    const m = computeMetrics(
      [
        result({ latencyMs: 100, inputTokens: 200, outputTokens: 20 }),
        result({ latencyMs: 300, inputTokens: 400, outputTokens: 40 }),
        result({ latencyMs: 200 }),
      ],
      ZERO_PRICES,
    );
    expect(m.avgLatencyMs).toBe(200);
    expect(m.avgInputTokens).toBe(300);
    expect(m.avgOutputTokens).toBe(30);
  });

  it('handles an empty run', () => {
    const m = computeMetrics([], ZERO_PRICES);
    expect(m.total).toBe(0);
    expect(m.categoryAccuracy).toBe(0);
  });
});

describe('cost (AC-E4)', () => {
  it('applies the formula', () => {
    // (1000 * 0.1 + 100 * 0.5) * 1000 / 1e6 = 0.15
    expect(costPer1000(1000, 100, { inputPerMTok: 0.1, outputPerMTok: 0.5 })).toBeCloseTo(0.15, 10);
  });

  it('is zero for local providers', () => {
    const m = computeMetrics([result({ inputTokens: 500, outputTokens: 50 })], ZERO_PRICES);
    expect(m.costPer1000).toBe(0);
  });

  it('reads prices from env with named-constant defaults', () => {
    expect(anthropicPrices({})).toEqual({
      inputPerMTok: DEFAULT_ANTHROPIC_INPUT_PER_MTOK,
      outputPerMTok: DEFAULT_ANTHROPIC_OUTPUT_PER_MTOK,
    });
    expect(DEFAULT_ANTHROPIC_INPUT_PER_MTOK).toBe(0.1);
    expect(DEFAULT_ANTHROPIC_OUTPUT_PER_MTOK).toBe(0.5);
    expect(
      anthropicPrices({ EVAL_ANTHROPIC_INPUT_PER_MTOK: '1', EVAL_ANTHROPIC_OUTPUT_PER_MTOK: '2' }),
    ).toEqual({ inputPerMTok: 1, outputPerMTok: 2 });
    expect(anthropicPrices({ EVAL_ANTHROPIC_INPUT_PER_MTOK: 'abc' }).inputPerMTok).toBe(0.1);
  });
});
