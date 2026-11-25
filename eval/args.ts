export const PROVIDER_IDS = ['ollama', 'anthropic', 'fake'] as const;
export type EvalProviderId = (typeof PROVIDER_IDS)[number];

export interface CliArgs {
  limit?: number;
  provider?: EvalProviderId;
}

export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {};
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === '--limit') {
      const n = Number(argv[++i]);
      if (!Number.isInteger(n) || n < 1) throw new Error('--limit expects a positive integer');
      args.limit = n;
    } else if (flag === '--provider') {
      const value = argv[++i];
      const id = PROVIDER_IDS.find((p) => p === value);
      if (!id) throw new Error(`--provider expects one of: ${PROVIDER_IDS.join(', ')}`);
      args.provider = id;
    } else {
      throw new Error(`unknown argument: ${flag ?? ''}`);
    }
  }
  return args;
}
