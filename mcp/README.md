# ticket-triage MCP server

A small [Model Context Protocol](https://modelcontextprotocol.io) server that lets an MCP
client (Claude Code, Claude Desktop, ...) search the help-center articles in `kb/`.

It exposes one tool:

| Tool                    | Input                          | Output                                                                                                                |
| ----------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `search_knowledge_base` | `{ "query": "<plain words>" }` | JSON text: `{ "retrieval": "embedding" \| "keyword", "results": [{ "id", "title", "text" }] }` with at most 3 results |

It uses the same retrieval as the API. At startup it embeds the articles with the local Ollama
embedding model (`EMBEDDING_MODEL`, default `nomic-embed-text`, at `OLLAMA_BASE_URL`) and ranks
articles by cosine similarity (`"retrieval": "embedding"`). If Ollama or the model is not
available it falls back to keyword search (`"retrieval": "keyword"`): the query is split into
lowercase words (one-letter words and common stop-words dropped) and an article scores one point
per distinct word found as a whole word in its title or text. A query with no relevant article
returns an empty `results` list; an empty query returns an MCP error result.

The server is read-only: it never writes files, and its only network access is the local Ollama
embedding endpoint. It speaks MCP over stdio, so stdout carries only protocol messages;
diagnostics go to stderr.

## Run

```bash
ollama pull nomic-embed-text   # optional; without it the server uses keyword search
npm install
npm run mcp
```

The articles are the Markdown files in `kb/` at the repository root (override the directory
with `KB_DIR`).

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

To point at another Ollama host or embedding model, add `"env": { "OLLAMA_BASE_URL": "...",
"EMBEDDING_MODEL": "..." }` to the JSON config, or `-e NAME=value` before the `--` in the
`claude mcp add` command.
