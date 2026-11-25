import type { Evaluation } from './evaluate';
import type { RetrievalEvaluation } from './retrieval';

export interface SkippedProvider {
  id: string;
  reason: string;
}

export interface ReportInput {
  date: Date;
  datasetSize: number;
  evaluations: Evaluation[];
  skipped: SkippedProvider[];
  /** Retrieval hit rates, one per mode that ran (AC-E7). */
  retrieval?: RetrievalEvaluation[];
  retrievalSkipped?: SkippedProvider[];
  /** Which retrieval the provider runs used (AC-E8). */
  providerRetrieval?: string;
}

const pct = (x: number): string => `${(x * 100).toFixed(1)}%`;

export function renderReport(input: ReportInput): string {
  const { date, datasetSize, evaluations, skipped } = input;
  const retrieval = input.retrieval ?? [];
  const retrievalSkipped = input.retrievalSkipped ?? [];
  const models = evaluations.map((e) => `${e.provider.id}: ${e.provider.model}`);
  const lines = [
    '# Triage evaluation',
    '',
    `- Date: ${date.toISOString()}`,
    `- Models: ${models.length > 0 ? models.join(', ') : 'none'}`,
    `- Dataset size: ${datasetSize} tickets`,
  ];
  if (input.providerRetrieval)
    lines.push(`- Retrieval used by provider runs: ${input.providerRetrieval}`);
  for (const s of skipped) lines.push(`- ${s.id}: skipped: ${s.reason}`);
  lines.push(
    '',
    '| Provider | Model | Category acc. | Priority acc. | Errors | Avg latency (ms) | Est. cost / 1,000 tickets (USD) |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  );
  for (const { provider, metrics: m } of evaluations) {
    lines.push(
      `| ${provider.id} | ${provider.model} | ${pct(m.categoryAccuracy)} | ${pct(m.priorityAccuracy)} | ${m.errors} | ${Math.round(m.avgLatencyMs)} | $${m.costPer1000.toFixed(4)} |`,
    );
  }
  for (const s of skipped) {
    lines.push(`| ${s.id} | - | skipped: ${s.reason} | - | - | - | - |`);
  }
  if (retrieval.length > 0 || retrievalSkipped.length > 0) {
    lines.push(
      '',
      '## Retrieval (top-3 hit rate)',
      '',
      '| Retrieval | Top-3 hit rate | Hits | Avg latency (ms) | Notes |',
      '| --- | --- | --- | --- | --- |',
    );
    for (const r of retrieval) {
      const note = r.fallbacks > 0 ? `${r.fallbacks} tickets fell back to keyword` : '';
      lines.push(
        `| ${r.mode} | ${pct(r.hitRate)} | ${r.hits}/${r.total} | ${Math.round(r.avgLatencyMs)} | ${note} |`,
      );
    }
    for (const s of retrievalSkipped) {
      lines.push(`| ${s.id} | skipped: ${s.reason} | - | - | |`);
    }
  }
  return `${lines.join('\n')}\n`;
}
