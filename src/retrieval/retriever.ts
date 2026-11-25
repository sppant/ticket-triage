import type { Embedder } from './embedder';
import { keywordSearch, DEFAULT_LIMIT } from './keyword';
import type { KbArticle } from './kb';
import { cosineSimilarity } from './similarity';

export type RetrievalMode = 'embedding' | 'keyword';

export interface RetrievalResult {
  articles: KbArticle[];
  mode: RetrievalMode;
}

/** Vectors for the articles, in the same order as the article list. */
type Index = number[][];

/**
 * Top-k article retrieval. With an embedder the article vectors are built once and kept in
 * memory; a ticket is embedded and matched by cosine similarity (AC-K3, AC-K4). Whenever the
 * embedding model is unavailable, retrieval falls back to keyword search (AC-K5) and never
 * throws.
 */
export class KnowledgeBase {
  private index?: Index;
  private building?: Promise<void>;

  constructor(
    readonly articles: readonly KbArticle[],
    private readonly embedder?: Embedder,
  ) {}

  /** True once the embedding index exists. */
  get ready(): boolean {
    return this.index !== undefined;
  }

  /** Builds the index. Resolves to whether it is ready; never rejects. */
  async init(): Promise<boolean> {
    if (this.index) return true;
    if (!this.embedder) return false;
    this.building ??= this.build(this.embedder).finally(() => {
      this.building = undefined;
    });
    await this.building;
    return this.ready;
  }

  async retrieve(query: string, limit: number = DEFAULT_LIMIT): Promise<RetrievalResult> {
    // If the index was not built at startup, try again (cheap when the model is down).
    if (!this.index) await this.init();
    if (this.index && this.embedder) {
      try {
        const vector = await this.embedder.embedQuery(query);
        return { articles: this.rank(this.index, vector, limit), mode: 'embedding' };
      } catch {
        // fall through to keyword search
      }
    }
    return { articles: keywordSearch(this.articles, query, limit), mode: 'keyword' };
  }

  private async build(embedder: Embedder): Promise<void> {
    try {
      const vectors = await embedder.embedDocuments(
        this.articles.map((a) => `${a.title}\n${a.text}`),
      );
      if (vectors.length === this.articles.length) this.index = vectors;
    } catch {
      // stay in keyword mode; retrieve() retries later
    }
  }

  private rank(index: Index, query: number[], limit: number): KbArticle[] {
    return this.articles
      .map((article, i) => ({
        article,
        score: cosineSimilarity(index[i] as number[], query),
        i,
      }))
      .sort((a, b) => b.score - a.score || a.i - b.i)
      .slice(0, limit)
      .map((s) => s.article);
  }
}
