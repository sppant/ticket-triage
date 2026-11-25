import { OllamaEmbedder } from './embedder';

function mockFetch(body: unknown, ok = true, status = 200): jest.Mock {
  const f = jest.fn().mockResolvedValue({ ok, status, json: async () => body });
  global.fetch = f as unknown as typeof fetch;
  return f;
}

describe('OllamaEmbedder', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('posts to /api/embed with task prefixes for nomic-embed-text', async () => {
    const f = mockFetch({ embeddings: [[1, 2]] });
    const e = new OllamaEmbedder({ baseUrl: 'http://x:1/', model: 'nomic-embed-text' });
    expect(await e.embedQuery('hello')).toEqual([1, 2]);
    const [url, init] = f.mock.calls[0] as [string, { body: string }];
    expect(url).toBe('http://x:1/api/embed');
    expect(JSON.parse(init.body)).toEqual({
      model: 'nomic-embed-text',
      input: ['search_query: hello'],
    });
  });

  it('sends text unchanged for other models', async () => {
    const f = mockFetch({ embeddings: [[1], [2]] });
    const e = new OllamaEmbedder({ baseUrl: 'http://x', model: 'other' });
    await e.embedDocuments(['a', 'b']);
    expect(JSON.parse((f.mock.calls[0] as [string, { body: string }])[1].body).input).toEqual([
      'a',
      'b',
    ]);
  });

  it('throws without echoing the text on errors and bad shapes', async () => {
    const e = new OllamaEmbedder({ baseUrl: 'http://x', model: 'm' });
    mockFetch({}, false, 404);
    await expect(e.embedQuery('SECRET-TEXT')).rejects.toThrow('status 404');
    mockFetch({ embeddings: 'nope' });
    await expect(e.embedQuery('SECRET-TEXT')).rejects.toThrow('unexpected shape');
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) as never;
    await expect(e.embedQuery('SECRET-TEXT')).rejects.toThrow('Embedding request failed');
  });
});
