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
| F8  | Labeled synthetic dataset (40 tickets)                                    | UC6, UC7       | B (eval)                |
| F9  | Eval runner and report (`npm run eval`, `eval/results.md`)                | UC6            | B                       |
| F10 | MCP server with read-only `find_similar_tickets` tool (stdio)             | UC7            | C (MCP + observability) |
| F11 | OpenTelemetry tracing (console or OTLP exporter)                          | UC8            | C                       |
| F12 | Structured JSON logs that never contain ticket content                    | UC8            | C                       |
| F13 | Single-page web UI: form, examples, result card, history                  | UC4, UC5       | D (web)                 |
| F14 | Reusable UI components with Storybook stories                             | UC4            | D                       |
| F15 | Browser test of the UI against the fake provider                          | UC4, UC10      | D                       |
| F16 | Repository quality: lint, types, tests, CI, env docs                      | UC10           | Base / integration      |

## Decisions that refine the original brief

- **F6** — the brief's response shape has no field that says why a model was chosen, but the UI must show it. The response therefore carries two extra fields, `provider` and `route_reason`.
- **F3** — a ticket with personal data never falls back to the hosted model. If the local model is unreachable the request fails with 502.
- **F9** — the fake provider is a test double. It is excluded from eval runs unless `EVAL_INCLUDE_FAKE=1`.
