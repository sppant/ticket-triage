import { OllamaProvider } from './ollama.provider';

const req = { system: 'SYS', user: 'SENTINEL-USER' };

function mockFetch(impl: () => Promise<Response>): jest.SpyInstance {
  return jest.spyOn(globalThis, 'fetch').mockImplementation(impl);
}

afterEach(() => jest.restoreAllMocks());

describe('OllamaProvider', () => {
  it('posts a non-streaming JSON chat request and maps tokens', async () => {
    const spy = mockFetch(() =>
      Promise.resolve(
        Response.json({
          model: 'llama3.2:1b',
          message: { content: '{"a":1}' },
          prompt_eval_count: 12,
          eval_count: 7,
        }),
      ),
    );
    const p = new OllamaProvider({ baseUrl: 'http://x:1/', model: 'llama3.2:1b' });
    const r = await p.complete(req);
    expect(r).toEqual({ text: '{"a":1}', model: 'llama3.2:1b', inputTokens: 12, outputTokens: 7 });
    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://x:1/api/chat');
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({ stream: false, format: 'json', options: { temperature: 0 } });
    expect(body.messages.map((m: { role: string }) => m.role)).toEqual(['system', 'user']);
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('throws without ticket text on a non-2xx response', async () => {
    mockFetch(() => Promise.resolve(new Response('SENTINEL-USER', { status: 500 })));
    const err = await new OllamaProvider({ baseUrl: 'http://x', model: 'm' })
      .complete(req)
      .catch((e: Error) => e);
    expect((err as Error).message).toContain('500');
    expect((err as Error).message).not.toContain('SENTINEL');
  });

  it('throws on network errors', async () => {
    mockFetch(() => Promise.reject(new TypeError('fetch failed SENTINEL-USER')));
    const err = await new OllamaProvider({ baseUrl: 'http://x', model: 'm' })
      .complete(req)
      .catch((e: Error) => e);
    expect((err as Error).message).not.toContain('SENTINEL');
  });
});
