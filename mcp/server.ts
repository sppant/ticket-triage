import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { createKnowledgeBase } from '../src/retrieval/retrieval.module';
import type { KnowledgeBase } from '../src/retrieval/retriever';

/**
 * Read-only MCP server (AC-M4): it never writes files. It uses the same retrieval as the API:
 * embeddings from the local Ollama model when available, keyword search otherwise.
 *
 * stdout is the protocol channel. Never write to stdout from this package; diagnostics go to
 * stderr.
 */
export function createServer(kb: KnowledgeBase): McpServer {
  const server = new McpServer({ name: 'ticket-triage', version: '0.2.0' });

  server.registerTool(
    'search_knowledge_base',
    {
      title: 'Search the knowledge base',
      description:
        'Searches the help-center articles. Returns up to 3 articles (id, title, text) ranked by ' +
        'relevance, and the retrieval mode used ("embedding" or "keyword").',
      inputSchema: { query: z.string().describe('What to look for, in plain words') },
      annotations: { readOnlyHint: true },
    },
    async ({ query }) => {
      if (!query.trim()) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: 'query must not be empty' }],
        };
      }
      const { articles, mode } = await kb.retrieve(query);
      const body = { retrieval: mode, results: articles };
      return { content: [{ type: 'text' as const, text: JSON.stringify(body, null, 2) }] };
    },
  );

  return server;
}

async function main(): Promise<void> {
  const kb = createKnowledgeBase(process.env);
  const ready = await kb.init();
  await createServer(kb).connect(new StdioServerTransport());
  process.stderr.write(
    `ticket-triage MCP server ready (${kb.articles.length} articles, ${ready ? 'embedding' : 'keyword'} retrieval)\n`,
  );
}

if (require.main === module) {
  main().catch((err: unknown) => {
    process.stderr.write(`ticket-triage MCP server failed: ${String(err)}\n`);
    process.exit(1);
  });
}
