import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import path from 'node:path';
import { loadDataset } from './dataset';
import { createServer } from './server';

const tickets = loadDataset(path.join(__dirname, '__fixtures__', 'tickets.jsonl'));

async function connect(): Promise<Client> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await createServer(tickets).connect(serverTransport);
  const client = new Client({ name: 'test', version: '0.0.0' });
  await client.connect(clientTransport);
  return client;
}

function textOf(result: Awaited<ReturnType<Client['callTool']>>): string {
  const content = result.content as { type: string; text?: string }[];
  return content[0]?.text ?? '';
}

describe('MCP server', () => {
  let client: Client;
  beforeEach(async () => {
    client = await connect();
  });
  afterEach(async () => {
    await client.close();
  });

  it('AC-M1: lists exactly one read-only tool with a string query parameter', async () => {
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(1);
    const [tool] = tools;
    expect(tool?.name).toBe('find_similar_tickets');
    expect(tool?.inputSchema.properties).toHaveProperty('query');
    expect(tool?.inputSchema.properties?.query).toMatchObject({ type: 'string' });
    expect(tool?.inputSchema.required).toEqual(['query']);
    expect(tool?.annotations?.readOnlyHint).toBe(true);
  });

  it('AC-M2: returns at most 3 tickets with the expected fields', async () => {
    const result = await client.callTool({
      name: 'find_similar_tickets',
      arguments: { query: 'app crashes login dashboard' },
    });
    expect(result.isError).toBeFalsy();
    const found = JSON.parse(textOf(result)) as Record<string, unknown>[];
    expect(found.length).toBeGreaterThan(0);
    expect(found.length).toBeLessThanOrEqual(3);
    expect(Object.keys(found[0] ?? {}).sort()).toEqual(
      ['body', 'category', 'id', 'priority', 'subject'].sort(),
    );
  });

  it('AC-M3: no match is an empty list, an empty query is an error result', async () => {
    const none = await client.callTool({
      name: 'find_similar_tickets',
      arguments: { query: 'zzzunmatched' },
    });
    expect(none.isError).toBeFalsy();
    expect(JSON.parse(textOf(none))).toEqual([]);

    const empty = await client.callTool({
      name: 'find_similar_tickets',
      arguments: { query: '  ' },
    });
    expect(empty.isError).toBe(true);
  });
});
