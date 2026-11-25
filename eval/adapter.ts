// The only eval module that imports runtime code from src/.
import { AnthropicProvider } from '../src/providers/anthropic.provider';
import { FakeProvider } from '../src/providers/fake.provider';
import { OllamaProvider } from '../src/providers/ollama.provider';
import { runTriage } from '../src/triage/run-triage';
import type { ModelProvider } from '../src/contracts';
import {
  checkAnthropic,
  checkFake,
  checkOllama,
  DEFAULT_ANTHROPIC_MODEL,
  DEFAULT_OLLAMA_BASE_URL,
  DEFAULT_OLLAMA_MODEL,
  type Availability,
} from './availability';
import type { EvalProvider, RunOne } from './evaluate';
import { anthropicPrices, ZERO_PRICES } from './metrics';

export interface Candidate {
  provider: EvalProvider;
  availability: Availability;
  runOne: RunOne;
}

/** A RunOne that sends each ticket through the real triage pipeline. */
export function makeRunOne(model: ModelProvider): RunOne {
  return async (ticket) => {
    const { output, completion } = await runTriage(model, {
      subject: ticket.subject,
      body: ticket.body,
    });
    return {
      category: output.category,
      priority: output.priority,
      inputTokens: completion.inputTokens,
      outputTokens: completion.outputTokens,
    };
  };
}

export async function buildProviders(env: NodeJS.ProcessEnv): Promise<Candidate[]> {
  const ollamaUrl = env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL;
  const ollamaModel = env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL;
  const anthropicModel = env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL;

  const ollama = new OllamaProvider({ baseUrl: ollamaUrl, model: ollamaModel });
  const anthropic = new AnthropicProvider({
    apiKey: env.ANTHROPIC_API_KEY ?? '',
    model: anthropicModel,
  });
  const fake = new FakeProvider();

  return [
    {
      provider: { id: 'ollama', model: ollamaModel, prices: ZERO_PRICES },
      availability: await checkOllama(ollamaUrl, ollamaModel),
      runOne: makeRunOne(ollama),
    },
    {
      provider: { id: 'anthropic', model: anthropicModel, prices: anthropicPrices(env) },
      availability: checkAnthropic(env),
      runOne: makeRunOne(anthropic),
    },
    {
      provider: { id: 'fake', model: fake.model, prices: ZERO_PRICES },
      availability: checkFake(env),
      runOne: makeRunOne(fake),
    },
  ];
}
