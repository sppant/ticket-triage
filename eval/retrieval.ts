import type { LabeledTicket } from './dataset';
import type { RetrievalResult } from '../src/retrieval/retriever';

export interface RetrievalEvaluation {
  /** Name shown in the report: the retrieval mode that was evaluated. */
  mode: 'embedding' | 'keyword';
  total: number;
  /** Tickets whose expected article is among the retrieved top 3 (AC-E7). */
  hits: number;
  hitRate: number;
  avgLatencyMs: number;
  /** Tickets served by keyword fallback although the embedding mode was requested. */
  fallbacks: number;
  misses: { id: string; expected: string; got: string[] }[];
}

/**
 * Top-3 hit rate: retrieves for every ticket the same way the API does (subject + body as the
 * query) and checks whether the expected article is among the results.
 */
export async function evaluateRetrieval(
  mode: RetrievalEvaluation['mode'],
  retrieve: (query: string) => Promise<RetrievalResult>,
  tickets: readonly LabeledTicket[],
): Promise<RetrievalEvaluation> {
  let hits = 0;
  let fallbacks = 0;
  let totalMs = 0;
  const misses: RetrievalEvaluation['misses'] = [];
  for (const ticket of tickets) {
    const started = performance.now();
    const result = await retrieve(`${ticket.subject}\n${ticket.body}`);
    totalMs += performance.now() - started;
    if (mode === 'embedding' && result.mode !== 'embedding') fallbacks++;
    const got = result.articles.map((a) => a.id);
    if (got.includes(ticket.article)) hits++;
    else misses.push({ id: ticket.id, expected: ticket.article, got });
  }
  const total = tickets.length;
  return {
    mode,
    total,
    hits,
    hitRate: total === 0 ? 0 : hits / total,
    avgLatencyMs: total === 0 ? 0 : totalMs / total,
    fallbacks,
    misses,
  };
}
