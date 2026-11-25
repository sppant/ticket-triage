import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildProviders } from './adapter';
import { parseArgs } from './args';
import { loadDataset } from './dataset';
import { evaluate, type Evaluation } from './evaluate';
import { renderReport, type SkippedProvider } from './report';

async function main(): Promise<void> {
  if (existsSync('.env')) process.loadEnvFile('.env');
  const args = parseArgs(process.argv.slice(2));

  const all = loadDataset();
  const tickets = args.limit ? all.slice(0, args.limit) : all;

  const candidates = (await buildProviders(process.env)).filter(
    (c) => !args.provider || c.provider.id === args.provider,
  );
  const evaluations: Evaluation[] = [];
  const skipped: SkippedProvider[] = [];
  for (const c of candidates) {
    if (!c.availability.available) {
      skipped.push({ id: c.provider.id, reason: c.availability.reason });
      continue;
    }
    evaluations.push(await evaluate(c.provider, tickets, c.runOne));
  }

  const report = renderReport({
    date: new Date(),
    datasetSize: tickets.length,
    evaluations,
    skipped,
  });
  process.stdout.write(report);
  writeFileSync(join(__dirname, 'results.md'), report);
}

main().catch((err: unknown) => {
  process.stderr.write(`eval failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
