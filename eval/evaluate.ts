import type { Category, Priority } from '../src/contracts';
import type { LabeledTicket } from './dataset';
import { computeMetrics, type Metrics, type Prices, type TicketResult } from './metrics';

export interface EvalProvider {
  id: string;
  model: string;
  prices: Prices;
}

export interface RunOneResult {
  category: Category;
  priority: Priority;
  inputTokens?: number;
  outputTokens?: number;
}

export type RunOne = (ticket: LabeledTicket) => Promise<RunOneResult>;

export interface Evaluation {
  provider: EvalProvider;
  results: TicketResult[];
  metrics: Metrics;
}

/** Runs tickets sequentially; a throw from runOne is recorded as an error (AC-E6). */
export async function evaluate(
  provider: EvalProvider,
  tickets: LabeledTicket[],
  runOne: RunOne,
  log: (line: string) => void = (line) => process.stderr.write(`${line}\n`),
): Promise<Evaluation> {
  const results: TicketResult[] = [];
  for (const [i, ticket] of tickets.entries()) {
    const expected = { category: ticket.category, priority: ticket.priority };
    const started = performance.now();
    let result: TicketResult;
    try {
      const out = await runOne(ticket);
      result = {
        id: ticket.id,
        expected,
        predicted: { category: out.category, priority: out.priority },
        latencyMs: performance.now() - started,
        inputTokens: out.inputTokens,
        outputTokens: out.outputTokens,
      };
    } catch (err) {
      result = {
        id: ticket.id,
        expected,
        error: err instanceof Error ? err.message : String(err),
        latencyMs: performance.now() - started,
      };
    }
    results.push(result);
    log(
      `[${provider.id}] ${i + 1}/${tickets.length} ${ticket.id} ${result.error ? `error: ${result.error}` : 'ok'}`,
    );
  }
  return { provider, results, metrics: computeMetrics(results, provider.prices) };
}
