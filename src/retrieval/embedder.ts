/** Turns text into vectors. The only implementation talks to a local Ollama server. */
export interface Embedder {
  embedDocuments(texts: string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
}

export interface OllamaEmbedderOptions {
  baseUrl: string;
  model: string;
  timeoutMs?: number;
}

/**
 * Embeddings from Ollama's `/api/embed`. nomic-embed-text is trained with task prefixes, so
 * they are added for that model family; other models get the text unchanged.
 */
export class OllamaEmbedder implements Embedder {
  private readonly url: string;
  private readonly timeoutMs: number;
  private readonly prefixes: { document: string; query: string };

  constructor(private readonly options: OllamaEmbedderOptions) {
    this.url = `${options.baseUrl.replace(/\/+$/, '')}/api/embed`;
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.prefixes = options.model.startsWith('nomic-embed-text')
      ? { document: 'search_document: ', query: 'search_query: ' }
      : { document: '', query: '' };
  }

  embedDocuments(texts: string[]): Promise<number[][]> {
    return this.embed(texts.map((t) => this.prefixes.document + t));
  }

  async embedQuery(text: string): Promise<number[]> {
    const [vector] = await this.embed([this.prefixes.query + text]);
    if (!vector) throw new Error('Embedding response was empty');
    return vector;
  }

  private async embed(input: string[]): Promise<number[][]> {
    let res: Response;
    try {
      res = await fetch(this.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model: this.options.model, input }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      throw new Error('Embedding request failed', { cause: err });
    }
    if (!res.ok) throw new Error(`Embedding request failed with status ${res.status}`);
    const data = (await res.json()) as { embeddings?: unknown };
    const vectors = data.embeddings;
    if (
      !Array.isArray(vectors) ||
      vectors.length !== input.length ||
      !vectors.every((v) => Array.isArray(v) && v.every((n) => typeof n === 'number'))
    ) {
      throw new Error('Embedding response had an unexpected shape');
    }
    return vectors as number[][];
  }
}
