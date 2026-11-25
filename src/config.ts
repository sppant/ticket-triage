export interface AppConfig {
  triageProvider: string;
  ollamaBaseUrl: string;
  ollamaModel: string;
  anthropicApiKey?: string;
  anthropicModel: string;
  embeddingModel: string;
  /** Knowledge-base directory; undefined means the repository's `kb/`. */
  kbDir?: string;
}

/** Reads configuration from the environment; empty values count as unset. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const get = (key: string): string | undefined => env[key]?.trim() || undefined;
  return {
    triageProvider: get('TRIAGE_PROVIDER') ?? '',
    ollamaBaseUrl: get('OLLAMA_BASE_URL') ?? 'http://localhost:11434',
    ollamaModel: get('OLLAMA_MODEL') ?? 'qwen2.5:1.5b',
    anthropicApiKey: get('ANTHROPIC_API_KEY'),
    anthropicModel: get('ANTHROPIC_MODEL') ?? 'claude-haiku-5-5',
    embeddingModel: get('EMBEDDING_MODEL') ?? 'nomic-embed-text',
    kbDir: get('KB_DIR'),
  };
}
