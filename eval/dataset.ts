import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { CATEGORIES, PRIORITIES } from '../src/contracts';

export const labeledTicketSchema = z.object({
  id: z.string().min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
  category: z.enum(CATEGORIES),
  priority: z.enum(PRIORITIES),
  /** Id (file name without .md) of the knowledge-base article that should be retrieved. */
  article: z.string().min(1),
});
export type LabeledTicket = z.infer<typeof labeledTicketSchema>;

export const DEFAULT_DATASET_PATH = join(__dirname, 'dataset.jsonl');

/** Parses and validates JSONL text; throws with the offending line number. */
export function parseDataset(text: string): LabeledTicket[] {
  const lines = text.split('\n').filter((l) => l.trim() !== '');
  const tickets = lines.map((line, i) => {
    let json: unknown;
    try {
      json = JSON.parse(line);
    } catch {
      throw new Error(`dataset line ${i + 1}: invalid JSON`);
    }
    const parsed = labeledTicketSchema.safeParse(json);
    if (!parsed.success) {
      throw new Error(`dataset line ${i + 1}: ${parsed.error.message}`);
    }
    return parsed.data;
  });
  const ids = new Set(tickets.map((t) => t.id));
  if (ids.size !== tickets.length) throw new Error('dataset has duplicate ids');
  return tickets;
}

export function loadDataset(path: string = DEFAULT_DATASET_PATH): LabeledTicket[] {
  return parseDataset(readFileSync(path, 'utf8'));
}
