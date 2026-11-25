import { readdirSync, readFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

/** A help-center article: `id` is the file name without `.md`, `title` the first `# ` line. */
export interface KbArticle {
  id: string;
  title: string;
  text: string;
}

/** Default knowledge-base directory: `kb/` at the repository root (works from src/ and dist/). */
export const DEFAULT_KB_DIR = resolve(__dirname, '..', '..', 'kb');

export function parseArticle(id: string, markdown: string): KbArticle {
  const match = /^#\s+(.+)$/m.exec(markdown);
  if (!match?.[1]) throw new Error(`Article ${id} has no "# Title" line`);
  const text = markdown.replace(match[0], '').trim();
  return { id, title: match[1].trim(), text };
}

/** Loads every `*.md` file in `dir`, sorted by file name so article order is stable. */
export function loadKnowledgeBase(dir: string = DEFAULT_KB_DIR): KbArticle[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => parseArticle(basename(f, '.md'), readFileSync(join(dir, f), 'utf8')));
}
