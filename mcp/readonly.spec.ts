import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

/**
 * AC-M4 guard: a static check that the server's own source does not import anything that
 * writes files or talks to the network. It cannot see what dependencies do internally; the
 * server only reads the dataset file once at startup.
 */
describe('read-only guarantee (AC-M4)', () => {
  const sources = readdirSync(__dirname)
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts'))
    .map((f) => ({ f, text: readFileSync(path.join(__dirname, f), 'utf8') }));

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
});
