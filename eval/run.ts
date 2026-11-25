import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildKnowledgeBases, buildProviders } from './adapter';
import { parseArgs } from './args';
import { loadDataset } from './dataset';
import { evaluate, type Evaluation } from './evaluate';
import { evaluateRetrieval, type RetrievalEvaluation } from './retrieval';
import { renderReport, type SkippedProvider } from './report';

async function main(): Promise<void> {
  if (existsSync('.env')) process.loadEnvFile('.env');
  const args = parseArgs(process.argv.slice(2));

  const all = loadDataset();
  const tickets = args.limit ? all.slice(0, args.limit) : all;

  // Retrieval first: the embedding index is built once (this is the API's startup step).
  const kbs = buildKnowledgeBases(process.env);
  const embeddingReady = await kbs.embedding.init();
  const retrieval: RetrievalEvaluation[] = [];
  const retrievalSkipped: SkippedProvider[] = [];
  if (embeddingReady) {
    process.stderr.write('[retrieval] embedding\n');
    retrieval.push(await evaluateRetrieval('embedding', (q) => kbs.embedding.retrieve(q), tickets));
  } else {
    retrievalSkipped.push({
      id: 'embedding',
      reason: 'embedding model unavailable (is Ollama running with EMBEDDING_MODEL pulled?)',
    });
  }
  process.stderr.write('[retrieval] keyword\n');
  retrieval.push(await evaluateRetrieval('keyword', (q) => kbs.keyword.retrieve(q), tickets));
  // Provider runs use the same retrieval the API would use right now.
  const providerKb = embeddingReady ? kbs.embedding : kbs.keyword;

  const candidates = (await buildProviders(process.env, providerKb)).filter(
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
    retrieval,
    retrievalSkipped,
    providerRetrieval: embeddingReady ? 'embedding' : 'keyword',
  });
  process.stdout.write(report);
  writeFileSync(join(__dirname, 'results.md'), report);
}

main().catch((err: unknown) => {
  process.stderr.write(`eval failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
