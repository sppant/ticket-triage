import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import fixture from '../src/retrieval/__fixtures__/vectors.json';
import { KnowledgeBase } from '../src/retrieval/retriever';
import { createServer } from './server';

const articles = fixture.articles.map(({ id, title, text }) => ({ id, title, text }));
const vectors = new Map<string, number[]>([
  ...fixture.articles.map((a) => [`${a.title}\n${a.text}`, a.vector] as [string, number[]]),
  ...Object.values(fixture.queries).map((q) => [q.text, q.vector] as [string, number[]]),
]);
const embedder = {
  embedDocuments: async (texts: string[]) => texts.map((t) => vectors.get(t) as number[]),
  embedQuery: async (t: string) => vectors.get(t) as number[],
};

async function connect(kb: KnowledgeBase): Promise<Client> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await createServer(kb).connect(serverTransport);
  const client = new Client({ name: 'test', version: '0.0.0' });
  await client.connect(clientTransport);
  return client;
}

function parse(result: Awaited<ReturnType<Client['callTool']>>): {
  retrieval: string;
  results: { id: string; title: string; text: string }[];
} {
  const content = result.content as { type: string; text?: string }[];
  return JSON.parse(content[0]?.text ?? '{}');
}

describe('MCP server', () => {
  const clients: Client[] = [];
  async function start(kb: KnowledgeBase): Promise<Client> {
    const c = await connect(kb);
    clients.push(c);
    return c;
  }
  afterEach(async () => {
    await Promise.all(clients.splice(0).map((c) => c.close()));
  });

  it('AC-M1: lists exactly one read-only tool, search_knowledge_base, with a string query', async () => {
    const client = await start(new KnowledgeBase(articles));
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(1);
    const [tool] = tools;
    expect(tool?.name).toBe('search_knowledge_base');
    expect(tool?.inputSchema.properties?.query).toMatchObject({ type: 'string' });
    expect(tool?.inputSchema.required).toEqual(['query']);
    expect(tool?.annotations?.readOnlyHint).toBe(true);
  });

  it('AC-M2: returns at most 3 articles ranked by embedding similarity, with the mode', async () => {
    const kb = new KnowledgeBase(articles, embedder);
    await kb.init();
    const client = await start(kb);
    const out = parse(
      await client.callTool({
        name: 'search_knowledge_base',
        arguments: { query: fixture.queries.billing.text },
      }),
    );
    expect(out.retrieval).toBe('embedding');
    expect(out.results.map((a) => a.id)).toEqual(['a-billing', 'a-mixed', 'a-bugs']);
    expect(Object.keys(out.results[0] ?? {}).sort()).toEqual(['id', 'text', 'title']);
  });

  it('AC-M2/K5: falls back to keyword search without an embedding model', async () => {
    const client = await start(new KnowledgeBase(articles));
    const out = parse(
      await client.callTool({
        name: 'search_knowledge_base',
        arguments: { query: 'refund for a charge' },
      }),
    );
    expect(out.retrieval).toBe('keyword');
    expect(out.results.map((a) => a.id)).toEqual(['a-billing']);
  });

  it('AC-M3: no match is an empty list, an empty query is an error result', async () => {
    const client = await start(new KnowledgeBase(articles));
    const none = await client.callTool({
      name: 'search_knowledge_base',
      arguments: { query: 'zzzunmatched' },
    });
    expect(none.isError).toBeFalsy();
    expect(parse(none).results).toEqual([]);

    const empty = await client.callTool({
      name: 'search_knowledge_base',
      arguments: { query: '  ' },
    });
    expect(empty.isError).toBe(true);
  });
});
