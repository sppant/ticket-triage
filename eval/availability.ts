import { z } from 'zod';

export const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434';
export const DEFAULT_OLLAMA_MODEL = 'qwen2.5:1.5b';
export const DEFAULT_ANTHROPIC_MODEL = 'claude-haiku-5-5';

export type Availability = { available: true } | { available: false; reason: string };

export type FetchLike = (
  url: string,
  init?: { signal?: AbortSignal },
) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

const tagsSchema = z.object({ models: z.array(z.object({ name: z.string() })) });

/** Ollama is available if /api/tags responds and lists the configured model. */
export async function checkOllama(
  baseUrl: string,
  model: string,
  fetchFn: FetchLike = fetch,
): Promise<Availability> {
  try {
    const res = await fetchFn(`${baseUrl.replace(/\/+$/, '')}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok)
      return { available: false, reason: `Ollama /api/tags returned HTTP ${res.status}` };
    const tags = tagsSchema.safeParse(await res.json());
    if (!tags.success)
      return { available: false, reason: 'Ollama /api/tags returned an unexpected body' };
    const names = tags.data.models.map((m) => m.name);
    // "llama3.2" is how Ollama resolves "llama3.2:latest".
    const found = names.some(
      (n) => n === model || (!model.includes(':') && n === `${model}:latest`),
    );
    return found
      ? { available: true }
      : {
          available: false,
          reason: `model ${model} is not pulled in Ollama (run: ollama pull ${model})`,
        };
  } catch {
    return { available: false, reason: `Ollama not reachable at ${baseUrl}` };
  }
}

export function checkAnthropic(env: NodeJS.ProcessEnv): Availability {
  return env.ANTHROPIC_API_KEY?.trim()
    ? { available: true }
    : { available: false, reason: 'ANTHROPIC_API_KEY is not set' };
}

export function checkFake(env: NodeJS.ProcessEnv): Availability {
  return env.EVAL_INCLUDE_FAKE === '1'
    ? { available: true }
    : { available: false, reason: 'EVAL_INCLUDE_FAKE is not 1 (fake is a test double)' };
}
