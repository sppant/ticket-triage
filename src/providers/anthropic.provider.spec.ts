import type Anthropic from '@anthropic-ai/sdk';
import { AnthropicProvider } from './anthropic.provider';

function client(create: jest.Mock) {
  return { messages: { create } };
}

describe('AnthropicProvider (mocked client; never run against the real API)', () => {
  it('defaults the model, sends no sampling params, disables thinking, maps usage', async () => {
    const create = jest.fn().mockResolvedValue({
      model: 'claude-haiku-5-5',
      content: [
        { type: 'thinking', thinking: 'x', signature: 's' },
        { type: 'text', text: '{"ok":true}' },
      ],
      usage: { input_tokens: 20, output_tokens: 9 },
    } as unknown as Anthropic.Message);
    const p = new AnthropicProvider({ apiKey: 'k', client: client(create) });
    expect(p.model).toBe('claude-haiku-5-5');
    const r = await p.complete({ system: 'SYS', user: 'USER' });
    expect(r).toEqual({
      text: '{"ok":true}',
      model: 'claude-haiku-5-5',
      inputTokens: 20,
      outputTokens: 9,
    });
    const params = create.mock.calls[0][0];
    expect(params).toMatchObject({
      model: 'claude-haiku-5-5',
      system: 'SYS',
      thinking: { type: 'disabled' },
      messages: [{ role: 'user', content: 'USER' }],
    });
    expect(params).not.toHaveProperty('temperature');
    expect(params).not.toHaveProperty('top_p');
    expect(params).not.toHaveProperty('top_k');
  });

  it('throws without ticket text when the client fails', async () => {
    const create = jest.fn().mockRejectedValue(new Error('boom SENTINEL'));
    const p = new AnthropicProvider({ apiKey: 'k', model: 'm', client: client(create) });
    const err = await p.complete({ system: 's', user: 'u' }).catch((e: Error) => e);
    expect((err as Error).message).not.toContain('SENTINEL');
  });
});
