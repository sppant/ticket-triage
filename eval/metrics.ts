import type { Category, Priority } from '../src/contracts';

/** Hosted-model default prices, USD per million tokens (Haiku 5.5). */
export const DEFAULT_ANTHROPIC_INPUT_PER_MTOK = 0.1;
export const DEFAULT_ANTHROPIC_OUTPUT_PER_MTOK = 0.5;

export interface Prices {
  inputPerMTok: number;
  outputPerMTok: number;
}

export const ZERO_PRICES: Prices = { inputPerMTok: 0, outputPerMTok: 0 };

function envNumber(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function anthropicPrices(env: NodeJS.ProcessEnv): Prices {
  return {
    inputPerMTok: envNumber(env.EVAL_ANTHROPIC_INPUT_PER_MTOK, DEFAULT_ANTHROPIC_INPUT_PER_MTOK),
    outputPerMTok: envNumber(env.EVAL_ANTHROPIC_OUTPUT_PER_MTOK, DEFAULT_ANTHROPIC_OUTPUT_PER_MTOK),
  };
}

/** One evaluated ticket. */
export interface TicketResult {
  id: string;
  expected: { category: Category; priority: Priority };
  /** Absent when the run failed. */
  predicted?: { category: Category; priority: Priority };
  error?: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
}

export interface Metrics {
  total: number;
  categoryAccuracy: number;
  priorityAccuracy: number;
  errors: number;
  avgLatencyMs: number;
  avgInputTokens: number;
  avgOutputTokens: number;
  costPer1000: number;
}

const mean = (values: number[]): number =>
  values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;

/** AC-E4: (avg in × in price + avg out × out price) × 1000 / 1e6. */
export function costPer1000(avgInput: number, avgOutput: number, prices: Prices): number {
  return ((avgInput * prices.inputPerMTok + avgOutput * prices.outputPerMTok) * 1000) / 1e6;
}

export function computeMetrics(results: TicketResult[], prices: Prices): Metrics {
  const total = results.length;
  // AC-E3 / AC-E6: failed runs have no prediction and so count as incorrect.
  const catOk = results.filter((r) => r.predicted?.category === r.expected.category).length;
  const priOk = results.filter((r) => r.predicted?.priority === r.expected.priority).length;
  const avgInputTokens = mean(
    results.flatMap((r) => (r.inputTokens === undefined ? [] : [r.inputTokens])),
  );
  const avgOutputTokens = mean(
    results.flatMap((r) => (r.outputTokens === undefined ? [] : [r.outputTokens])),
  );
  return {
    total,
    categoryAccuracy: total === 0 ? 0 : catOk / total,
    priorityAccuracy: total === 0 ? 0 : priOk / total,
    errors: results.filter((r) => r.error !== undefined).length,
    avgLatencyMs: mean(results.map((r) => r.latencyMs)),
    avgInputTokens,
    avgOutputTokens,
    costPer1000: costPer1000(avgInputTokens, avgOutputTokens, prices),
  };
}
