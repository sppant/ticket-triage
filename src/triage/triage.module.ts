import { Module } from '@nestjs/common';
import { loadConfig } from '../config';
import { AnthropicProvider } from '../providers/anthropic.provider';
import { FakeProvider } from '../providers/fake.provider';
import { OllamaProvider } from '../providers/ollama.provider';
import { Router } from '../router/router';
import { TriageController } from './triage.controller';
import { TriageService } from './triage.service';

export const LOCAL_PROVIDER = Symbol('LOCAL_PROVIDER');
export const HOSTED_PROVIDER = Symbol('HOSTED_PROVIDER');
export const FAKE_PROVIDER = Symbol('FAKE_PROVIDER');

@Module({
  controllers: [TriageController],
  providers: [
    TriageService,
    {
      provide: LOCAL_PROVIDER,
      useFactory: () => {
        const c = loadConfig();
        return new OllamaProvider({ baseUrl: c.ollamaBaseUrl, model: c.ollamaModel });
      },
    },
    {
      provide: HOSTED_PROVIDER,
      useFactory: () => {
        const c = loadConfig();
        return c.anthropicApiKey
          ? new AnthropicProvider({ apiKey: c.anthropicApiKey, model: c.anthropicModel })
          : undefined;
      },
    },
    {
      provide: FAKE_PROVIDER,
      useFactory: () => (loadConfig().triageProvider === 'fake' ? new FakeProvider() : undefined),
    },
    {
      provide: Router,
      inject: [LOCAL_PROVIDER, HOSTED_PROVIDER, FAKE_PROVIDER],
      useFactory: (
        local: OllamaProvider,
        hosted: AnthropicProvider | undefined,
        fake: FakeProvider | undefined,
      ) => new Router({ local, hosted, fake }),
    },
  ],
})
export class TriageModule {}
