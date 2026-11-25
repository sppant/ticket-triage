# Actors

| ID  | Actor | Kind | Goal |
| --- | ----- | ---- | ---- |
| A1  | Support agent | Human | Gets a category, priority and draft reply for an incoming ticket quickly, through the web UI. |
| A2  | API client | System | Another service that submits tickets over HTTP and consumes the structured result. |
| A3  | Evaluator | Human | Measures how well each available model labels tickets, and what it costs. |
| A4  | Operator | Human | Needs to see what the service did (traces, logs) without ticket content leaking into them. |
| A5  | MCP client | System | An LLM assistant that looks up similar example tickets through the Model Context Protocol. |
| A6  | Maintainer | Human | Changes the code and relies on CI to catch regressions. |

## External systems

| ID  | System | Role |
| --- | ------ | ---- |
| S1  | Local model (Ollama) | Free, private, open-weight model on the same machine. |
| S2  | Hosted model (Anthropic API) | Optional frontier model; used only when an API key is configured and the ticket has no personal data. |
| S3  | OTLP collector | Optional trace sink. |
