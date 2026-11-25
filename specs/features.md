# Features

Features are derived from the use cases in [use-cases.md](use-cases.md). Acceptance criteria are in [acceptance-criteria.md](acceptance-criteria.md).

| ID  | Feature                                                                   | Derived from   | Delivery unit           |
| --- | ------------------------------------------------------------------------- | -------------- | ----------------------- |
| F1  | `POST /triage` endpoint with input validation                             | UC1            | A (API)                 |
| F2  | PII detector (email, phone, card-like number)                             | UC2            | A                       |
| F3  | Router (PII → local; else hosted if key set; else local; `fake` override) | UC2, UC5       | A                       |
| F4  | Providers: Ollama, Anthropic, deterministic Fake                          | UC1, UC2, UC10 | A                       |
| F5  | Model-output validation with Zod, one retry, then HTTP 502                | UC3            | A                       |
| F6  | Routing explanation in the response (`provider`, `route_reason`)          | UC5            | A                       |
| F7  | OpenAPI document served at `/docs`                                        | UC9            | A                       |
| F8  | Labeled synthetic dataset (40 tickets, with expected article)             | UC6, UC11      | B (eval)                |
| F9  | Eval runner and report (`npm run eval`, `eval/results.md`)                | UC6            | B                       |
| F10 | MCP server with read-only `search_knowledge_base` tool (stdio)            | UC7            | C (MCP + observability) |
| F11 | OpenTelemetry tracing (console or OTLP exporter)                          | UC8            | C                       |
| F12 | Structured JSON logs that never contain ticket content                    | UC8            | C                       |
| F13 | Single-page web UI: form, examples, result card, history                  | UC4, UC5       | D (web)                 |
| F14 | Reusable UI components with Storybook stories                             | UC4            | D                       |
| F15 | Browser test of the UI against the fake provider                          | UC4, UC10      | D                       |
| F16 | Repository quality: lint, types, tests, CI, env docs                      | UC10           | Base / integration      |
| F17 | Knowledge base: 15-20 synthetic help-center articles in `kb/`             | UC11           | RAG                     |
| F18 | In-memory embedding index built at startup with a local Ollama model      | UC11           | RAG                     |
| F19 | Retrieval: cosine top 3, keyword fallback, context passed to the model    | UC11           | RAG                     |
| F20 | `sources` and `retrieval` in the response; sources shown in the UI        | UC11, UC5      | RAG                     |
| F21 | Retrieval hit rate in the eval                                            | UC6, UC11      | RAG                     |

## Decisions that refine the original brief

- **F6** — the brief's response shape has no field that says why a model was chosen, but the UI must show it. The response therefore carries two extra fields, `provider` and `route_reason`.
- **F3** — a ticket with personal data never falls back to the hosted model. If the local model is unreachable the request fails with 502.
- **F9** — the fake provider is a test double. It is excluded from eval runs unless `EVAL_INCLUDE_FAKE=1`.
- **F19** — embeddings always come from the local model, including for tickets without personal data, so no ticket text is sent to a hosted service for retrieval. The hosted model receives the ticket and the retrieved articles only when the router chose it.
- **F19** — a retrieval failure never fails a request; it degrades to keyword search and says so in `retrieval`.
- **F10** — the MCP tool `find_similar_tickets` is replaced by `search_knowledge_base`. The server may call the local embedding model (it falls back to keyword search), so it is no longer network-free.
- **F18** — vectors are kept in memory only (18-20 short articles; nothing is written to disk).
