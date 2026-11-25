# ticket-triage MCP server

A small [Model Context Protocol](https://modelcontextprotocol.io) server that lets an MCP
client (Claude Code, Claude Desktop, ...) look up similar tickets in the labeled dataset.

It exposes one tool:

| Tool                   | Input                       | Output                                                                                          |
| ---------------------- | --------------------------- | ----------------------------------------------------------------------------------------------- |
| `find_similar_tickets` | `{ "query": "<keywords>" }` | JSON array (text content) of at most 3 tickets: `id`, `subject`, `body`, `category`, `priority` |

Matching is a plain keyword search: the query is lowercased and split into alphanumeric
words (one-letter words and common stop-words are dropped). A ticket's score is the number of
distinct query words that appear as whole words in its subject or body. The top 3 tickets
with a score above 0 are returned, ties broken by dataset order. A query with no matches
returns `[]`; an empty query returns an MCP error result.

The server is read-only: it reads the dataset file once at startup and never writes files or
makes network calls. It speaks MCP over stdio, so stdout carries only protocol messages;
diagnostics go to stderr.

## Run

```bash
npm install
npm run mcp
```

The dataset is `eval/dataset.jsonl` in the repository root (resolved relative to the code, not
the current directory). Set `MCP_DATASET_PATH` to use another JSONL file with the same fields.

## Client configuration

Clients start the server as a subprocess. `cwd` handling differs between clients, so the
snippet below uses absolute paths and does not depend on the working directory. Replace
`/absolute/path/to/ticket-triage` with your checkout (run `npm install` there first).

```json
{
  "mcpServers": {
    "ticket-triage": {
      "command": "/absolute/path/to/ticket-triage/node_modules/.bin/tsx",
      "args": ["/absolute/path/to/ticket-triage/mcp/server.ts"]
    }
  }
}
```

Claude Code:

```bash
claude mcp add ticket-triage -- /absolute/path/to/ticket-triage/node_modules/.bin/tsx /absolute/path/to/ticket-triage/mcp/server.ts
```

To search a different dataset, add `"env": { "MCP_DATASET_PATH": "/path/to/file.jsonl" }` to
the JSON config, or `-e MCP_DATASET_PATH=/path/to/file.jsonl` before the `--` in the
`claude mcp add` command.
