import type { CompletionRequest, CompletionResult, ModelProvider } from '../contracts';

/**
 * Deterministic keyword-based test double (AC-R7). No network, no randomness,
 * no timestamps. If help-center articles are in the prompt, the reply mentions the first one's
 * title so tests can see that retrieval reached the model. Only the ticket text after the last "Ticket:" marker of the
 * user prompt is inspected, so system-prompt wording cannot influence it.
 */
export class FakeProvider implements ModelProvider {
  readonly id = 'fake' as const;
  readonly model = 'fake-1';

  complete(request: CompletionRequest): Promise<CompletionResult> {
    const marker = request.user.lastIndexOf('Ticket:');
    const source = /^\[1\] (.+)$/m.exec(marker >= 0 ? request.user.slice(0, marker) : '')?.[1];
    const text = (marker >= 0 ? request.user.slice(marker) : request.user).toLowerCase();
    const category = classify(text);
    const priority = prioritize(text);
    const draft_reply = `Thanks for reaching out. We have logged your ${category.replace('_', ' ')} request and will follow up soon.${source ? ` See: ${source}.` : ''}`;
    return Promise.resolve({
      text: JSON.stringify({ category, priority, draft_reply }),
      model: this.model,
    });
  }
}

function classify(text: string): string {
  if (/invoice|charge|refund|payment/.test(text)) return 'billing';
  if (/error|crash|bug|broken/.test(text)) return 'bug';
  if (/feature|would be nice|please add/.test(text)) return 'feature_request';
  if (/password|login|account|email change/.test(text)) return 'account';
  return 'other';
}

function prioritize(text: string): string {
  if (/urgent|asap|down|can't|cannot/.test(text)) return 'high';
  if (/question|when you can|nice to have/.test(text)) return 'low';
  return 'medium';
}
