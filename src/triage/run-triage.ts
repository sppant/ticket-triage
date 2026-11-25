import {
  CATEGORIES,
  PRIORITIES,
  modelOutputSchema,
  type CompletionRequest,
  type CompletionResult,
  type ModelOutput,
  type ModelProvider,
  type Ticket,
} from '../contracts';

/** The model answered twice without producing a valid result (AC-V3). Never carries ticket text. */
export class InvalidModelOutputError extends Error {
  constructor() {
    super('Model returned invalid output');
    this.name = 'InvalidModelOutputError';
  }
}

export const SYSTEM_PROMPT = `You triage customer support tickets.
Classify the ticket and write a short, polite draft reply to the customer.
category must be one of: ${CATEGORIES.join(', ')}.
priority must be one of: ${PRIORITIES.join(', ')}.
Answer ONLY with a JSON object of the form {"category": "...", "priority": "...", "draft_reply": "..."} and nothing else.

Example:
Ticket:
Subject: Charged twice
Body: I was charged twice for my March invoice, please refund one payment.
Answer: {"category": "billing", "priority": "medium", "draft_reply": "Sorry about the double charge. We are checking your March invoice and will refund the extra payment."}`;

export function buildPrompt(ticket: Ticket): CompletionRequest {
  return {
    system: SYSTEM_PROMPT,
    user: `Ticket:\nSubject: ${ticket.subject}\nBody: ${ticket.body}\nAnswer:`,
  };
}

/** Pulls a JSON value out of raw model text: a ```json fence (AC-V4) or the first {...} block. */
export function extractJson(text: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  const candidates = [text.trim()];
  if (fenced?.[1]) candidates.unshift(fenced[1].trim());
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) candidates.push(text.slice(start, end + 1));
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // try the next candidate
    }
  }
  return undefined;
}

function parseOutput(text: string): ModelOutput | undefined {
  const parsed = modelOutputSchema.safeParse(extractJson(text));
  return parsed.success ? parsed.data : undefined;
}

function addOptional(total: number | undefined, n: number | undefined): number | undefined {
  return n === undefined ? total : (total ?? 0) + n;
}

export interface TriageRun {
  output: ModelOutput;
  completion: CompletionResult;
  attempts: 1 | 2;
}

/** Calls the provider, validates the output, retries exactly once on invalid output (AC-V2). */
export async function runTriage(provider: ModelProvider, ticket: Ticket): Promise<TriageRun> {
  const request = buildPrompt(ticket);
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;
  for (const attempts of [1, 2] as const) {
    const completion = await provider.complete(request);
    // Token usage covers every attempt, so cost estimates include the retry.
    inputTokens = addOptional(inputTokens, completion.inputTokens);
    outputTokens = addOptional(outputTokens, completion.outputTokens);
    const output = parseOutput(completion.text);
    if (output)
      return { output, completion: { ...completion, inputTokens, outputTokens }, attempts };
  }
  throw new InvalidModelOutputError();
}
