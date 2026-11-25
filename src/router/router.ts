import type { ModelProvider, Ticket } from '../contracts';
import { detectPii } from '../pii/pii';

export interface RouterProviders {
  local: ModelProvider;
  hosted?: ModelProvider;
  /** When present, every ticket goes here (TRIAGE_PROVIDER=fake). */
  fake?: ModelProvider;
}

export interface RouteDecision {
  provider: ModelProvider;
  reason: string;
}

/** Chooses a provider per ticket (AC-R1..R5). Personal data never goes to the hosted model. */
export class Router {
  constructor(private readonly providers: RouterProviders) {}

  decide(ticket: Ticket): RouteDecision {
    const { local, hosted, fake } = this.providers;
    if (fake) return { provider: fake, reason: 'fake provider: TRIAGE_PROVIDER=fake' };
    if (detectPii(`${ticket.subject}\n${ticket.body}`).hasPii) {
      return { provider: local, reason: 'local model: ticket contains personal data' };
    }
    if (hosted) {
      return {
        provider: hosted,
        reason: 'hosted model: no personal data and an API key is configured',
      };
    }
    return { provider: local, reason: 'local model: no ANTHROPIC_API_KEY configured' };
  }
}
