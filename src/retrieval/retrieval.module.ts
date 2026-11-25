import { Logger, Module, type OnModuleInit } from '@nestjs/common';
import { loadConfig } from '../config';
import { OllamaEmbedder } from './embedder';
import { DEFAULT_KB_DIR, loadKnowledgeBase } from './kb';
import { KnowledgeBase } from './retriever';

/** Builds the knowledge base from the environment (shared by the API and the MCP server). */
export function createKnowledgeBase(env: NodeJS.ProcessEnv = process.env): KnowledgeBase {
  const c = loadConfig(env);
  const articles = loadKnowledgeBase(c.kbDir ?? DEFAULT_KB_DIR);
  // The fake provider means "no models at all", so retrieval is keyword-only there.
  const embedder =
    c.triageProvider === 'fake'
      ? undefined
      : new OllamaEmbedder({ baseUrl: c.ollamaBaseUrl, model: c.embeddingModel });
  return new KnowledgeBase(articles, embedder);
}

@Module({
  providers: [{ provide: KnowledgeBase, useFactory: () => createKnowledgeBase() }],
  exports: [KnowledgeBase],
})
export class RetrievalModule implements OnModuleInit {
  private readonly logger = new Logger(RetrievalModule.name);

  constructor(private readonly kb: KnowledgeBase) {}

  /** Embeds the articles at startup; on failure the service runs with keyword search. */
  async onModuleInit(): Promise<void> {
    const ready = await this.kb.init();
    this.logger.log(
      ready
        ? `Embedding index ready (${this.kb.articles.length} articles)`
        : `Embedding model unavailable; using keyword search (${this.kb.articles.length} articles)`,
    );
  }
}
