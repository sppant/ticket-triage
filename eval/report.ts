import type { Evaluation } from './evaluate';

export interface SkippedProvider {
  id: string;
  reason: string;
}

export interface ReportInput {
  date: Date;
  datasetSize: number;
  evaluations: Evaluation[];
  skipped: SkippedProvider[];
}

const pct = (x: number): string => `${(x * 100).toFixed(1)}%`;

export function renderReport(input: ReportInput): string {
  const { date, datasetSize, evaluations, skipped } = input;
  const models = evaluations.map((e) => `${e.provider.id}: ${e.provider.model}`);
  const lines = [
    '# Triage evaluation',
    '',
    `- Date: ${date.toISOString()}`,
    `- Models: ${models.length > 0 ? models.join(', ') : 'none'}`,
    `- Dataset size: ${datasetSize} tickets`,
  ];
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
  return `${lines.join('\n')}\n`;
}
