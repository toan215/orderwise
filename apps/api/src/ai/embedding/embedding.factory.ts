import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EmbeddingProvider } from './embedding.types';
import { OpenAiEmbeddingProvider } from './openai.embedding';
import { MockEmbeddingProvider } from './mock.embedding';

/** Pick the embedding provider from env: real when a key exists, else mock. */
@Injectable()
export class EmbeddingProviderFactory {
  constructor(private readonly config: ConfigService) {}

  create(): EmbeddingProvider {
    const key = this.config.get<string>('EMBEDDING_API_KEY', '')?.trim()
      || this.config.get<string>('LLM_API_KEY', '')?.trim();
    if (key) return new OpenAiEmbeddingProvider(this.config);
    return new MockEmbeddingProvider(this.config);
  }
}
