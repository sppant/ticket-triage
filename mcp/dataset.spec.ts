import { mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DEFAULT_DATASET_PATH, loadDataset, resolveDatasetPath } from './dataset';

describe('dataset', () => {
  it('loads the fixture', () => {
    expect(loadDataset(path.join(__dirname, '__fixtures__', 'tickets.jsonl'))).toHaveLength(8);
  });

  it('defaults to eval/dataset.jsonl in the repo root, independent of cwd', () => {
    expect(DEFAULT_DATASET_PATH).toBe(path.resolve(__dirname, '..', 'eval', 'dataset.jsonl'));
    expect(resolveDatasetPath({})).toBe(DEFAULT_DATASET_PATH);
    expect(resolveDatasetPath({ MCP_DATASET_PATH: '' })).toBe(DEFAULT_DATASET_PATH);
    expect(resolveDatasetPath({ MCP_DATASET_PATH: '/x/y.jsonl' })).toBe('/x/y.jsonl');
  });

  it('reports the line of an invalid record', () => {
    const file = path.join(mkdtempSync(path.join(os.tmpdir(), 'ds-')), 'bad.jsonl');
    writeFileSync(
      file,
      '{"id":"a","subject":"s","body":"b","category":"bug","priority":"low"}\n{"id":"b"}\n',
    );
    expect(() => loadDataset(file)).toThrow(/bad\.jsonl:2:/);
  });
});
