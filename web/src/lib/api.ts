import { z } from 'zod';

// Base URL of the API (see NEXT_PUBLIC_API_URL in the root .env.example).
const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').replace(/\/$/, '');

export const SUBJECT_MAX = 200;
export const BODY_MAX = 5000;

export const triageResponseSchema = z.object({
  category: z.enum(['billing', 'bug', 'feature_request', 'account', 'other']),
  priority: z.enum(['low', 'medium', 'high']),
  draft_reply: z.string(),
  model: z.string(),
  latency_ms: z.number(),
  provider: z.enum(['ollama', 'anthropic', 'fake']),
  route_reason: z.string(),
  sources: z.array(z.string()),
  retrieval: z.enum(['embedding', 'keyword']),
});

export type TriageResult = z.infer<typeof triageResponseSchema>;
export type Category = TriageResult['category'];
export type Priority = TriageResult['priority'];
export interface Ticket {
  subject: string;
  body: string;
}

export class ApiError extends Error {}

function messageFrom(payload: unknown, fallback: string): string {
  if (typeof payload === 'object' && payload !== null && 'message' in payload) {
    const { message } = payload as { message: unknown };
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.filter((m) => typeof m === 'string').join('; ');
  }
  return fallback;
}

export async function triage(ticket: Ticket, signal?: AbortSignal): Promise<TriageResult> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/triage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ticket),
      signal,
    });
  } catch {
    throw new ApiError(`Could not reach the API at ${API_URL}. Check that it is running.`);
  }

  const payload: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(messageFrom(payload, `The API responded with status ${res.status}.`));
  }
  const parsed = triageResponseSchema.safeParse(payload);
  if (!parsed.success) throw new ApiError('The API returned a response in an unexpected format.');
  return parsed.data;
}
