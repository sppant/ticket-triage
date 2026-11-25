import type { DatasetTicket } from './tickets';

export const DEFAULT_LIMIT = 3;

const STOP_WORDS = new Set([
  'on', 'in', 'to', 'of', 'is', 'it', 'at', 'be', 'do', 'an', 'as', 'by', 'or', 'my', 'me', 'we', 'so', 'if', 'no', 'up',
  'the', 'and', 'for', 'with', 'you', 'your', 'are', 'was', 'were', 'not', 'but', 'can',
  'has', 'have', 'had', 'this', 'that', 'from', 'about', 'how', 'why', 'what', 'when',
  'who', 'its', 'our', 'out', 'any', 'all', 'too', 'very', 'into', 'than', 'then',
]); // prettier-ignore

/** Lowercase alphanumeric keywords, without very short words and common stop-words, deduplicated. */
export function extractKeywords(query: string): string[] {
  const tokens = query.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return [...new Set(tokens.filter((t) => t.length > 1 && !STOP_WORDS.has(t)))];
}

/**
 * Pure keyword search. Score = number of distinct query keywords found (whole-word match) in
 * subject + body. Ties keep dataset order; only scores > 0 are returned.
 */
export function findSimilarTickets(
  tickets: readonly DatasetTicket[],
  query: string,
  limit: number = DEFAULT_LIMIT,
): DatasetTicket[] {
  const keywords = extractKeywords(query);
  if (keywords.length === 0) return [];
  return tickets
    .map((ticket, index) => {
      const words = new Set(`${ticket.subject} ${ticket.body}`.toLowerCase().match(/[a-z0-9]+/g));
      return { ticket, index, score: keywords.filter((k) => words.has(k)).length };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map((s) => s.ticket);
}
