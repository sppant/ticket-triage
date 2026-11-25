import type { ModelProvider, ProviderId } from '../contracts';
import { Router } from './router';

function stub(id: ProviderId): ModelProvider {
  return { id, model: `${id}-model`, complete: jest.fn() };
}

const plain = { subject: 'Refund', body: 'Please refund my order.' };
const pii = { subject: 'Refund', body: 'Reach me at jane@example.com' };

describe('Router', () => {
  it('AC-R1 routes PII to local with or without a hosted provider', () => {
    const local = stub('ollama');
    for (const hosted of [undefined, stub('anthropic')]) {
      const d = new Router({ local, hosted }).decide(pii);
      expect(d.provider).toBe(local);
      expect(d.reason).toBe('local model: ticket contains personal data');
    }
  });

  it('AC-R1 detects PII in the subject too', () => {
    const local = stub('ollama');
    const d = new Router({ local, hosted: stub('anthropic') }).decide({
      subject: 'Card 4111 1111 1111 1111',
      body: 'declined',
    });
    expect(d.provider).toBe(local);
  });

  it('AC-R2 routes non-PII to hosted when configured', () => {
    const hosted = stub('anthropic');
    const d = new Router({ local: stub('ollama'), hosted }).decide(plain);
    expect(d.provider).toBe(hosted);
    expect(d.reason).toBe('hosted model: no personal data and an API key is configured');
  });

  it('AC-R3 routes non-PII to local without hosted', () => {
    const local = stub('ollama');
    const d = new Router({ local }).decide(plain);
    expect(d.provider).toBe(local);
    expect(d.reason).toBe('local model: no ANTHROPIC_API_KEY configured');
  });

  it('AC-R4 routes everything to fake and calls no other provider', () => {
    const local = stub('ollama');
    const hosted = stub('anthropic');
    const fake = stub('fake');
    const router = new Router({ local, hosted, fake });
    for (const t of [plain, pii]) {
      const d = router.decide(t);
      expect(d.provider).toBe(fake);
      expect(d.reason).toBe('fake provider: TRIAGE_PROVIDER=fake');
    }
    expect(local.complete).not.toHaveBeenCalled();
    expect(hosted.complete).not.toHaveBeenCalled();
  });
});
