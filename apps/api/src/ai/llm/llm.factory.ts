import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { LlmProvider } from './llm.types';
import { OpenAiProvider } from './openai.provider';
import { MockLlmProvider } from './mock.provider';

/** Pick the provider from env: real OpenAI-compatible when a key exists, else mock. */
@Injectable()
export class LlmProviderFactory {
  constructor(private readonly config: ConfigService) {}

  create(): LlmProvider {
    const key = this.config.get<string>('LLM_API_KEY', '')?.trim();
    if (key) return new OpenAiProvider(this.config);
    return new MockLlmProvider();
  }
}
