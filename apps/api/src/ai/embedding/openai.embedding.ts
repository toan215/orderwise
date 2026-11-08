import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EmbeddingProvider } from './embedding.types';

/** OpenAI-compatible embeddings client, used when EMBEDDING_API_KEY is set. */
@Injectable()
export class OpenAiEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'openai';
  readonly dimensions: number;
  private readonly logger = new Logger(OpenAiEmbeddingProvider.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('EMBEDDING_API_KEY', '')?.trim()
      || config.get<string>('LLM_API_KEY', '')?.trim();
    this.baseUrl = (config.get<string>('EMBEDDING_BASE_URL', '') || config.get<string>('LLM_BASE_URL', '') || 'https://api.openai.com/v1')
      .replace(/\/$/, '');
    this.model = config.get<string>('EMBEDDING_MODEL', 'text-embedding-3-small');
    this.dimensions = Number(config.get<string>('EMBEDDING_DIM', '1024'));
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ model: this.model, input: texts }),
      });
    } catch (err) {
      throw new Error(`Embedding request failed: ${String(err)}`);
    }
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Embedding ${res.status}: ${detail.slice(0, 300)}`);
    }
    const data = (await res.json()) as {
      data?: Array<{ embedding: number[] }>;
    };
    return (data.data ?? []).map((d) => d.embedding);
  }
}
