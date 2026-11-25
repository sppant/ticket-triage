import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import type { Ticket, TriageResponse } from '../contracts';
import { Telemetry } from '../observability/telemetry';
import { Router } from '../router/router';
import { InvalidModelOutputError, runTriage, type TriageRun } from './run-triage';

@Injectable()
export class TriageService {
  private readonly logger = new Logger(TriageService.name);

  constructor(
    private readonly router: Router,
    private readonly telemetry: Telemetry,
  ) {}

  triage(ticket: Ticket): Promise<TriageResponse> {
    return this.telemetry.span('triage.request', {}, async () => {
      const { provider, reason } = this.router.decide(ticket);
      const started = performance.now();
      let run: TriageRun;
      try {
        run = await this.telemetry.span(
          'model.call',
          { 'llm.provider': provider.id, 'llm.model': provider.model },
          async (span) => {
            const result = await runTriage(provider, ticket);
            const { inputTokens, outputTokens } = result.completion;
            span.setAttributes({
              'llm.latency_ms': Math.round(performance.now() - started),
              ...(inputTokens !== undefined && { 'llm.input_tokens': inputTokens }),
              ...(outputTokens !== undefined && { 'llm.output_tokens': outputTokens }),
            });
            return result;
          },
        );
      } catch (err) {
        // Log only the error class and provider: never ticket content.
        this.logger.warn(
          `triage failed provider=${provider.id} error=${err instanceof Error ? err.name : 'unknown'}`,
        );
        throw new BadGatewayException(
          err instanceof InvalidModelOutputError
            ? 'The model returned an invalid response'
            : 'The model provider failed',
        );
      }
      return {
        ...run.output,
        model: run.completion.model,
        latency_ms: Math.round(performance.now() - started),
        provider: provider.id,
        route_reason: reason,
      };
    });
  }
}
