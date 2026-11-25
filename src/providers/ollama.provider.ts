import type { CompletionRequest, CompletionResult, ModelProvider } from '../contracts';

export interface OllamaProviderOptions {
  baseUrl: string;
  model: string;
  timeoutMs?: number;
}

interface OllamaChatResponse {
  message?: { content?: string };
  model?: string;
  prompt_eval_count?: number;
  eval_count?: number;
}

/** Local open-weight model served by Ollama (`POST /api/chat`). */
export class OllamaProvider implements ModelProvider {
  readonly id = 'ollama' as const;
  readonly model: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(options: OllamaProviderOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.model = options.model;
    this.timeoutMs = options.timeoutMs ?? 120_000;
  }

  async complete(request: CompletionRequest): Promise<CompletionResult> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          stream: false,
          format: 'json',
          options: { temperature: 0 },
          messages: [
            { role: 'system', content: request.system },
            { role: 'user', content: request.user },
          ],
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      const reason = err instanceof Error ? err.name : 'unknown error';
      throw new Error(`Ollama request failed (${reason})`, { cause: err });
    }
    if (!response.ok) {
      throw new Error(`Ollama returned HTTP ${response.status}`);
    }
    let data: OllamaChatResponse;
    try {
      data = (await response.json()) as OllamaChatResponse;
    } catch {
      throw new Error('Ollama returned a non-JSON response');
    }
    return {
      text: data.message?.content ?? '',
      model: data.model ?? this.model,
      inputTokens: data.prompt_eval_count,
      outputTokens: data.eval_count,
    };
  }
}
