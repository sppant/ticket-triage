import type { CompletionResult, ModelProvider } from '../contracts';
import { InvalidModelOutputError, extractJson, runTriage } from './run-triage';

const ticket = { subject: 'SENTINEL-SUBJECT', body: 'SENTINEL-BODY' };
const valid = { category: 'bug', priority: 'high', draft_reply: 'We are on it.' };

function provider(texts: string[]): ModelProvider & { complete: jest.Mock } {
  const complete = jest.fn();
  texts.forEach((text) => complete.mockResolvedValueOnce({ text, model: 'm' } as CompletionResult));
  return { id: 'fake', model: 'm', complete };
}

describe('runTriage', () => {
  it('returns validated output on the first attempt', async () => {
    const p = provider([JSON.stringify(valid)]);
    const r = await runTriage(p, ticket);
    expect(r.output).toEqual(valid);
    expect(r.attempts).toBe(1);
    expect(p.complete).toHaveBeenCalledTimes(1);
    expect(p.complete.mock.calls[0][0].user).toContain('SENTINEL-BODY');
  });

  it('AC-V4 accepts output in a markdown code fence', async () => {
    const r = await runTriage(provider(['```json\n' + JSON.stringify(valid) + '\n```']), ticket);
    expect(r.output).toEqual(valid);
  });

  it('accepts JSON surrounded by prose', async () => {
    const r = await runTriage(provider([`Sure! ${JSON.stringify(valid)} Hope it helps.`]), ticket);
    expect(r.output).toEqual(valid);
  });

  it.each([
    ['not json', 'hello'],
    ['unknown category', JSON.stringify({ ...valid, category: 'spam' })],
    ['unknown priority', JSON.stringify({ ...valid, priority: 'urgent' })],
    ['missing draft_reply', JSON.stringify({ category: 'bug', priority: 'low' })],
  ])('AC-V1/V2 rejects %s then succeeds on exactly one retry', async (_n, bad) => {
    const p = provider([bad, JSON.stringify(valid)]);
    const r = await runTriage(p, ticket);
    expect(r.attempts).toBe(2);
    expect(p.complete).toHaveBeenCalledTimes(2);
  });

  it('AC-V3 throws InvalidModelOutputError after two invalid outputs, without ticket text', async () => {
    const p = provider(['nope', '{"category":"x"}']);
    const err = await runTriage(p, ticket).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(InvalidModelOutputError);
    expect((err as Error).message).not.toContain('SENTINEL');
    expect(p.complete).toHaveBeenCalledTimes(2);
  });

  it('AC-V3 propagates provider exceptions without retrying', async () => {
    const complete = jest.fn().mockRejectedValue(new Error('down'));
    await expect(runTriage({ id: 'ollama', model: 'm', complete }, ticket)).rejects.toThrow('down');
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('extractJson returns undefined when nothing parses', () => {
    expect(extractJson('no braces')).toBeUndefined();
  });
});
