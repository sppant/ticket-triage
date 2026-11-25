import { modelOutputSchema } from '../contracts';
import { buildPrompt } from '../triage/run-triage';
import { FakeProvider } from './fake.provider';

async function run(subject: string, body: string) {
  const res = await new FakeProvider().complete(buildPrompt({ subject, body }));
  return { res, out: modelOutputSchema.parse(JSON.parse(res.text)) };
}

describe('FakeProvider', () => {
  it('AC-R7 is deterministic', async () => {
    const a = await run('Invoice', 'I was charged twice');
    const b = await run('Invoice', 'I was charged twice');
    expect(a.res).toEqual(b.res);
  });

  it('AC-R7 reports model fake-1 and no token counts', async () => {
    const { res } = await run('x', 'y');
    expect(res.model).toBe('fake-1');
    expect(res.inputTokens).toBeUndefined();
    expect(res.outputTokens).toBeUndefined();
  });

  it.each([
    ['Refund', 'please refund me', 'billing', 'medium'],
    ['App', 'it crashes on start, urgent', 'bug', 'high'],
    ['Idea', 'it would be nice to have dark mode', 'feature_request', 'low'],
    ['Login', 'I forgot my password', 'account', 'medium'],
    ['Hello', 'just saying thanks', 'other', 'medium'],
  ])('classifies %s / %s', async (s, b, category, priority) => {
    const { out } = await run(s, b);
    expect(out.category).toBe(category);
    expect(out.priority).toBe(priority);
  });

  it('ignores wording of the system prompt (example ticket is not matched)', async () => {
    const { out } = await run('Hi', 'hello there');
    expect(out.category).toBe('other');
  });
});
