import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

/**
 * AC-M4 guard: a static check that neither the server's own source nor the retrieval code it
 * uses writes files, and that the server itself makes no network calls (embeddings go through
 * the retrieval code's Ollama client). It cannot see what dependencies do internally.
 */
function sourcesIn(dir: string): { f: string; text: string }[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts'))
    .map((f) => ({
      f: path.join(path.basename(dir), f),
      text: readFileSync(path.join(dir, f), 'utf8'),
    }));
}

describe('read-only guarantee (AC-M4)', () => {
  const sources = sourcesIn(__dirname);
  const retrieval = sourcesIn(path.join(__dirname, '..', 'src', 'retrieval'));

  it.each([
    [
      'file writes',
      /writeFile|appendFile|createWriteStream|mkdirSync|unlinkSync|rmSync|renameSync/,
    ],
    ['network access', /node:(http|https|net|dgram|tls)\b|\bfetch\(|XMLHttpRequest|WebSocket/],
    ['stdout logging', /console\.log|process\.stdout/],
  ])('does not use %s', (_label, pattern) => {
    expect(sources.length).toBeGreaterThan(0);
    for (const { f, text } of sources) {
      expect({ f, hit: pattern.test(text) }).toEqual({ f, hit: false });
    }
  });

  it('retrieval code does not write files', () => {
    expect(retrieval.length).toBeGreaterThan(0);
    const writes = /writeFile|appendFile|createWriteStream|mkdirSync|unlinkSync|rmSync|renameSync/;
    for (const { f, text } of retrieval) {
      expect({ f, hit: writes.test(text) }).toEqual({ f, hit: false });
    }
  });
});
