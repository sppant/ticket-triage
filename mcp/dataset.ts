import { readFileSync } from 'node:fs';
import path from 'node:path';
import { datasetTicketSchema, type DatasetTicket } from './tickets';

/** Default dataset, resolved from this file (not the cwd) so clients can launch from anywhere. */
export const DEFAULT_DATASET_PATH = path.resolve(__dirname, '..', 'eval', 'dataset.jsonl');

export function resolveDatasetPath(env: Record<string, string | undefined> = process.env): string {
  const configured = env.MCP_DATASET_PATH?.trim();
  return configured ? path.resolve(configured) : DEFAULT_DATASET_PATH;
}

/** Reads and validates a JSONL dataset (read-only). Throws with the line number on bad input. */
export function loadDataset(file: string): DatasetTicket[] {
  const lines = readFileSync(file, 'utf8').split('\n');
  const tickets: DatasetTicket[] = [];
  lines.forEach((line, i) => {
    if (!line.trim()) return;
    let json: unknown;
    try {
      json = JSON.parse(line);
    } catch {
      throw new Error(`${file}:${i + 1}: invalid JSON`);
    }
    const parsed = datasetTicketSchema.safeParse(json);
    if (!parsed.success) {
      throw new Error(`${file}:${i + 1}: ${parsed.error.issues.map((x) => x.message).join('; ')}`);
    }
    tickets.push(parsed.data);
  });
  return tickets;
}
