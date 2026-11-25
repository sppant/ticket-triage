import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { loadDataset, resolveDatasetPath } from './dataset';
import { DEFAULT_LIMIT, findSimilarTickets } from './search';
import type { DatasetTicket } from './tickets';

/**
 * Read-only MCP server (AC-M4): it only reads the dataset file at startup and keeps it in
 * memory; it never writes files and makes no network calls.
 *
 * stdout is the protocol channel. Never write to stdout from this package; diagnostics go to
 * stderr.
 */
export function createServer(tickets: readonly DatasetTicket[]): McpServer {
  const server = new McpServer({ name: 'ticket-triage', version: '0.1.0' });

  server.registerTool(
    'find_similar_tickets',
    {
      title: 'Find similar tickets',
      description:
        'Keyword search over the labeled support-ticket dataset. Returns up to 3 tickets ' +
        '(id, subject, body, category, priority) ranked by how many query keywords they contain.',
      inputSchema: { query: z.string().describe('Keywords describing the ticket to look for') },
      annotations: { readOnlyHint: true },
    },
    ({ query }) => {
      if (!query.trim()) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: 'query must not be empty' }],
        };
      }
      const results = findSimilarTickets(tickets, query, DEFAULT_LIMIT);
      return { content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }] };
    },
  );

  return server;
}

async function main(): Promise<void> {
  const file = resolveDatasetPath();
  const tickets = loadDataset(file);
  await createServer(tickets).connect(new StdioServerTransport());
  process.stderr.write(`ticket-triage MCP server ready (${tickets.length} tickets from ${file})\n`);
}

if (require.main === module) {
  main().catch((err: unknown) => {
    process.stderr.write(`ticket-triage MCP server failed: ${String(err)}\n`);
    process.exit(1);
  });
}
