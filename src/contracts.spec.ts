import { modelOutputSchema, ticketSchema } from './contracts';

describe('contracts', () => {
  it('rejects empty tickets (AC-A3)', () => {
    expect(ticketSchema.safeParse({ subject: ' ', body: 'x' }).success).toBe(false);
    expect(ticketSchema.safeParse({ subject: 'a', body: 'x'.repeat(5001) }).success).toBe(false);
  });

  it('rejects unknown categories (AC-V1)', () => {
    const r = modelOutputSchema.safeParse({ category: 'spam', priority: 'low', draft_reply: 'hi' });
    expect(r.success).toBe(false);
  });
});
