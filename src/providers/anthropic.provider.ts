import Anthropic from '@anthropic-ai/sdk';
import type { CompletionRequest, CompletionResult, ModelProvider } from '../contracts';

export const DEFAULT_ANTHROPIC_MODEL = 'claude-haiku-5-5';

/** The slice of the SDK client this provider uses (lets tests inject a mock). */
export interface AnthropicClientLike {
  messages: {
    create(params: Anthropic.MessageCreateParamsNonStreaming): Promise<Anthropic.Message>;
  };
}

export interface AnthropicProviderOptions {
  apiKey: string;
  model?: string;
  client?: AnthropicClientLike;
}

/**
 * Hosted model via the Anthropic Messages API. For Haiku 5.5 no sampling
 * parameters are sent (non-default values are rejected), no assistant prefill
 * is used, and thinking is disabled to keep latency and cost low.
 */
export class AnthropicProvider implements ModelProvider {
  readonly id = 'anthropic' as const;
  readonly model: string;
  private readonly client: AnthropicClientLike;

  constructor(options: AnthropicProviderOptions) {
    this.model = options.model ?? DEFAULT_ANTHROPIC_MODEL;
    this.client = options.client ?? new Anthropic({ apiKey: options.apiKey });
  }

  async complete(request: CompletionRequest): Promise<CompletionResult> {
    let message: Anthropic.Message;
    try {
      message = await this.client.messages.create({
        model: this.model,
        max_tokens: 1024,
        thinking: { type: 'disabled' },
        system: request.system,
        messages: [{ role: 'user', content: request.user }],
      });
    } catch (err) {
      const reason = err instanceof Anthropic.APIError ? `HTTP ${err.status}` : 'request error';
      throw new Error(`Anthropic request failed (${reason})`, { cause: err });
    }
    const block = message.content.find((b) => b.type === 'text');
    return {
      text: block && block.type === 'text' ? block.text : '',
      model: message.model,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    };
  }
}
