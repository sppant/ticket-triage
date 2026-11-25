import type { KbArticle } from './kb';

export const DEFAULT_LIMIT = 3;

const STOP_WORDS = new Set([
  'on', 'in', 'to', 'of', 'is', 'it', 'at', 'be', 'do', 'an', 'as', 'by', 'or', 'my', 'me', 'we', 'so', 'if', 'no', 'up',
  'the', 'and', 'for', 'with', 'you', 'your', 'are', 'was', 'were', 'not', 'but', 'can',
  'has', 'have', 'had', 'this', 'that', 'from', 'about', 'how', 'why', 'what', 'when',
  'who', 'its', 'our', 'out', 'any', 'all', 'too', 'very', 'into', 'than', 'then',
]); // prettier-ignore

/** Lowercase alphanumeric keywords, without one-letter words and stop-words, deduplicated. */
export function extractKeywords(query: string): string[] {
  const tokens = query.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return [...new Set(tokens.filter((t) => t.length > 1 && !STOP_WORDS.has(t)))];
}

/**
 * Keyword search (AC-K5). An article's score is the number of distinct query keywords that
 * appear as whole words in its title and text. Only scores above 0 are returned, best first,
 * ties broken by article order.
 */
export function keywordSearch(
  articles: readonly KbArticle[],
  query: string,
  limit: number = DEFAULT_LIMIT,
): KbArticle[] {
  const keywords = extractKeywords(query);
  if (keywords.length === 0) return [];
  return articles
    .map((article, index) => {
      const words = new Set(`${article.title} ${article.text}`.toLowerCase().match(/[a-z0-9]+/g));
      return { article, index, score: keywords.filter((k) => words.has(k)).length };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map((s) => s.article);
}
