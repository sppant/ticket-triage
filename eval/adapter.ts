// The only eval module that imports runtime code from src/.
import { AnthropicProvider } from '../src/providers/anthropic.provider';
import { FakeProvider } from '../src/providers/fake.provider';
import { OllamaProvider } from '../src/providers/ollama.provider';
import { loadConfig } from '../src/config';
import { OllamaEmbedder } from '../src/retrieval/embedder';
import { DEFAULT_KB_DIR, loadKnowledgeBase } from '../src/retrieval/kb';
import { KnowledgeBase } from '../src/retrieval/retriever';
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

/** The two knowledge bases the eval compares: embedding retrieval and keyword-only retrieval. */
export function buildKnowledgeBases(env: NodeJS.ProcessEnv): {
  embedding: KnowledgeBase;
  keyword: KnowledgeBase;
} {
  const c = loadConfig(env);
  const articles = loadKnowledgeBase(c.kbDir ?? DEFAULT_KB_DIR);
  const embedder = new OllamaEmbedder({ baseUrl: c.ollamaBaseUrl, model: c.embeddingModel });
  return { embedding: new KnowledgeBase(articles, embedder), keyword: new KnowledgeBase(articles) };
}

/**
 * A RunOne that sends each ticket through the real pipeline: retrieval (as the API does it),
 * then prompt, validation and retry. Retrieval time is part of the measured latency.
 */
export function makeRunOne(model: ModelProvider, kb: KnowledgeBase): RunOne {
  return async (ticket) => {
    const ticketText = { subject: ticket.subject, body: ticket.body };
    const { articles } = await kb.retrieve(`${ticket.subject}\n${ticket.body}`);
    const { output, completion } = await runTriage(model, ticketText, articles);
    return {
      category: output.category,
      priority: output.priority,
      inputTokens: completion.inputTokens,
      outputTokens: completion.outputTokens,
    };
  };
}

export async function buildProviders(
  env: NodeJS.ProcessEnv,
  kb: KnowledgeBase,
): Promise<Candidate[]> {
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
      runOne: makeRunOne(ollama, kb),
    },
    {
      provider: { id: 'anthropic', model: anthropicModel, prices: anthropicPrices(env) },
      availability: checkAnthropic(env),
      runOne: makeRunOne(anthropic, kb),
    },
    {
      provider: { id: 'fake', model: fake.model, prices: ZERO_PRICES },
      availability: checkFake(env),
      runOne: makeRunOne(fake, kb),
    },
  ];
}
