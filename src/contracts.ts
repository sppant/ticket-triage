import { z } from 'zod';

export const CATEGORIES = ['billing', 'bug', 'feature_request', 'account', 'other'] as const;
export const PRIORITIES = ['low', 'medium', 'high'] as const;

export type Category = (typeof CATEGORIES)[number];
export type Priority = (typeof PRIORITIES)[number];

/** Request body of POST /triage (AC-A3). */
export const ticketSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(5000),
});
export type Ticket = z.infer<typeof ticketSchema>;

/** What a model must return (AC-V1). */
export const modelOutputSchema = z.object({
  category: z.enum(CATEGORIES),
  priority: z.enum(PRIORITIES),
  draft_reply: z.string().trim().min(1),
});
export type ModelOutput = z.infer<typeof modelOutputSchema>;

export type ProviderId = 'ollama' | 'anthropic' | 'fake';

export interface CompletionRequest {
  system: string;
  user: string;
}

export interface CompletionResult {
  /** Raw model text, not yet validated. */
  text: string;
  /** Identifier of the model that actually answered. */
  model: string;
  inputTokens?: number;
  outputTokens?: number;
}

/** A model backend. Implementations: OllamaProvider, AnthropicProvider, FakeProvider. */
export interface ModelProvider {
  readonly id: ProviderId;
  /** Configured model name. */
  readonly model: string;
  complete(request: CompletionRequest): Promise<CompletionResult>;
}

/** Response body of POST /triage (AC-A1). */
export interface TriageResponse extends ModelOutput {
  model: string;
  latency_ms: number;
  provider: ProviderId;
  route_reason: string;
  /** Titles of the help-center articles given to the model, best first (AC-K7). */
  sources: string[];
  /** How the articles were found: embedding similarity, or keyword fallback (AC-K5). */
  retrieval: 'embedding' | 'keyword';
}
