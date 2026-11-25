# Acceptance criteria

Every criterion is testable. Tests reference criteria by ID (for example `AC-R2`) in their names or comments.

Vocabulary: **PII** = personal data as defined in AC-P*. **Local** = Ollama provider. **Hosted** = Anthropic provider.

## API — `POST /triage` (F1, F6)

- **AC-A1** Given a valid body `{subject, body}` and the fake provider, the response is `200` with exactly the fields `category`, `priority`, `draft_reply`, `model`, `latency_ms`, `provider`, `route_reason`, `sources`, `retrieval`.
- **AC-A2** `category` is one of `billing|bug|feature_request|account|other`; `priority` is one of `low|medium|high`; `draft_reply` is a non-empty string; `latency_ms` is a non-negative number.
- **AC-A3** A missing, non-string or empty `subject` or `body` returns `400`. `subject` longer than 200 characters or `body` longer than 5000 characters returns `400`.
- **AC-A4** `GET /docs` returns an HTML page and `GET /docs-json` returns an OpenAPI 3 document that describes `POST /triage`.

## PII detector (F2)

- **AC-P1** `detectPii(text)` returns `{ hasPii: boolean, kinds: Array<'email'|'phone'|'card'> }`.
- **AC-P2** Email: `jane.doe@example.com` is detected; `see docs at example.com` is not.
- **AC-P3** Phone: `+30 694 123 4567`, `(555) 123-4567` and `555-123-4567` are detected; `order #48213` and `version 3.2.1` are not.
- **AC-P4** Card-like: `4111 1111 1111 1111` and `4111-1111-1111-1111` (13–19 digits, optionally separated by single spaces or hyphens) are detected; a 6-digit number is not.
- **AC-P5** Subject and body are both scanned; `kinds` has no duplicates.

## Router (F3, F4)

- **AC-R1** A ticket with PII is routed to Local, whether or not an Anthropic key is configured. `route_reason` is `local model: ticket contains personal data`.
- **AC-R2** A ticket without PII and with an Anthropic key configured is routed to Hosted.
- **AC-R3** A ticket without PII and without an Anthropic key is routed to Local.
- **AC-R4** With `TRIAGE_PROVIDER=fake`, every ticket is routed to the fake provider and the other providers are never called.
- **AC-R5** A PII ticket is never sent to Hosted, even when Local fails (the request fails with `502`, see AC-V3).
- **AC-R6** `model` in the response is the model identifier that actually answered; `provider` is `ollama`, `anthropic` or `fake`.
- **AC-R7** The fake provider is deterministic: the same ticket always yields the same output, and it needs no network.

## Output validation (F5)

- **AC-V1** Model output that is not valid JSON, has an unknown category or priority, or lacks `draft_reply` is rejected by a Zod schema.
- **AC-V2** On invalid output the provider is called exactly once more. If the second output is valid, the request succeeds.
- **AC-V3** If the second output is also invalid, or the provider throws, the response is `502` with a JSON error body that has a `message` and does not contain ticket text.
- **AC-V4** Output wrapped in a Markdown code fence is accepted if the JSON inside is valid.

## Evaluation (F8, F9)

- **AC-E1** `eval/dataset.jsonl` has exactly 40 lines; each is JSON with `id`, `subject`, `body`, `category`, `priority`, `article` (the id of the expected knowledge-base article, which must exist in `kb/`); all five categories and all three priorities appear; at least 4 tickets contain PII according to `detectPii`.
- **AC-E2** Dataset tickets are synthetic: all email addresses use `example.com`/`example.org`, phone numbers use fictional ranges, and card numbers are well-known test numbers.
- **AC-E3** Accuracy is `correct / total` per field, computed separately for category and priority.
- **AC-E4** Cost per 1,000 tickets is `(avg input tokens × input price + avg output tokens × output price) × 1000 / 1e6`; local providers cost 0. Prices come from named constants.
- **AC-E5** `npm run eval` runs every available provider (Ollama if reachable, Anthropic if a key is set), prints a table, and writes `eval/results.md`. A provider that is unavailable is reported as skipped with a reason and never given numbers.
- **AC-E7** Top-3 hit rate is `tickets whose expected article is among the 3 retrieved ÷ total tickets`. It is computed for each retrieval mode that is available (embedding if the embedding model is reachable, keyword always), reported in `eval/results.md` with the mode name, and a mode that cannot run is reported as skipped.
- **AC-E8** Provider runs in the eval use the same retrieval as the API, so their accuracy figures include the retrieved context.
- **AC-E6** A ticket that fails validation (502-equivalent) counts as incorrect for both fields and is counted in an `errors` column.

## MCP server (F10)

- **AC-M1** The server speaks MCP over stdio and lists exactly one tool, `search_knowledge_base`, with a `query` string parameter.
- **AC-M2** The tool uses the same retrieval as the API and returns at most 3 articles ranked by relevance, each with `id`, `title` and `text`, plus the `retrieval` mode used (`embedding` or `keyword`).
- **AC-M3** A query with no relevant article returns an empty list, not an error (keyword mode); an empty query returns an error result.
- **AC-M4** The server is read-only: it never writes files. Its only network access is the local Ollama embedding endpoint; if that is unreachable it falls back to keyword search.

## Retrieval (F17-F20)

- **AC-K1** `kb/` contains 15 to 20 Markdown articles; each starts with a `# Title` line; the text is synthetic (no real names, companies or data).
- **AC-K2** `cosineSimilarity(a, b)` returns 1 for identical non-zero vectors, 0 for orthogonal vectors, -1 for opposite vectors, 0 when either vector is all zeros (never `NaN`), and throws when the lengths differ.
- **AC-K3** With an embedder, retrieval returns the 3 articles whose vectors have the highest cosine similarity to the query vector, best first, and reports `retrieval: "embedding"`. Tested with precomputed fixture vectors, no model.
- **AC-K4** At startup the service embeds every article with the configured Ollama embedding model (`EMBEDDING_MODEL`, default `nomic-embed-text`) and keeps the vectors in memory.
- **AC-K5** If the embedding model is unavailable (index not built, or the query cannot be embedded), retrieval uses keyword search and reports `retrieval: "keyword"`, and the request still succeeds. Keyword search scores an article by the number of distinct query words found as whole words in its title and text (lowercased; one-letter words and common stop-words ignored); it returns at most 3 articles with a score above 0, ties broken by article order. If the index was not built at startup, a later request tries to build it again.
- **AC-K6** The title and text of the retrieved articles are included in the prompt sent to the model, before the ticket.
- **AC-K7** The response has `sources` (titles of the retrieved articles, best first, at most 3) and `retrieval` (`"embedding"` or `"keyword"`). When the fake provider is selected, retrieval uses keyword search.
- **AC-K8** Ticket text is embedded only by the local model, never sent to a hosted service for retrieval, and is not logged.

## Observability (F11, F12)

- **AC-O1** A triage request produces a span named `triage.request` with a child span `model.call`.
- **AC-O2** `model.call` has attributes `llm.provider`, `llm.model`, `llm.latency_ms`, and `llm.input_tokens` / `llm.output_tokens` when the provider reports them.
- **AC-O3** Spans are exported to the console by default and to OTLP/HTTP when `OTEL_EXPORTER_OTLP_ENDPOINT` is set.
- **AC-O4** Logs are JSON, one object per line. No log line and no span attribute contains the subject, the body or the draft reply of a ticket (tested with a sentinel string).

## Web UI (F13, F14, F15)

- **AC-W1** The page has a form with labelled `Subject` and `Body` fields and at least three one-click example tickets, one of which contains personal data.
- **AC-W2** Submitting calls `POST {NEXT_PUBLIC_API_URL}/triage` and renders a result card with category badge, priority badge, draft reply, model name, route reason, latency, and the list of source article titles with the retrieval mode.
- **AC-W3** The draft reply has a copy button that copies its text to the clipboard.
- **AC-W4** Before the first submission the result area shows an empty state; while waiting it shows a loading state; on an API error it shows an error message with the form content preserved.
- **AC-W5** The last five results are listed in a history section, held in memory only (a reload clears it).
- **AC-W6** Light and dark themes work, following the system setting with a manual toggle. Animations are disabled under `prefers-reduced-motion`.
- **AC-W7** All interactive elements are reachable and operable by keyboard and show a visible focus state. The layout has no horizontal scroll at 360 px width.
- **AC-W8** Badge, Card, Button and Input components each have a Storybook story.
- **AC-W9** A Playwright test submits an example ticket against the API running with the fake provider and asserts the result card renders.

## Repository (F16)

- **AC-Q1** `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` pass from a clean checkout; the web app also lints, type-checks and builds.
- **AC-Q2** No test needs network access, an API key or a running model.
- **AC-Q3** CI runs install, lint, typecheck, test and the web build on push and pull request.
- **AC-Q4** `.env.example` lists every environment variable the code reads; `.env` is gitignored.
- **AC-Q5** The repository contains no Dockerfile or compose file.
