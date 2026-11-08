import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EmbeddingProvider } from './embedding.types';

/**
 * Deterministic, hash-based embedding so RAG works without any API key.
 * The vector is a stable pseudo-random 1024-dim unit-ish vector derived from the
 * text, so identical/similar strings map close in cosine space. Not semantically
 * meaningful beyond exact/token overlap — RagService always ALSO runs a lexical
 * (ILIKE) fallback, so retrieval is correct even with this provider. Swap for
 * the OpenAI provider with a real key for true semantic retrieval.
 */
@Injectable()
export class MockEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'mock';
  readonly dimensions: number;

  constructor(config: ConfigService) {
    // Match the pgvector column (vector(1024)) — do not change without a migration.
    this.dimensions = Number(config.get<string>('EMBEDDING_DIM', '1024')) || 1024;
  }

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((t) => this.vectorFor(t));
  }

  private vectorFor(text: string): number[] {
    const dim = this.dimensions;
    const vec = new Array<number>(dim).fill(0);
    const tokens = text.toLowerCase().split(/[\s,.:;!?()[\]{}'"”’/\\-]+/).filter((t) => t.length > 0);
    // Token -> stable bucket => add n-gram influence at a pseudo-random offset.
    for (const tok of tokens) {
      const base = this.hash(tok);
      // Spread across a window so similar tokens overlap.
      const center = base % dim;
      for (let k = -2; k <= 2; k++) {
        const idx = (center + k + dim) % dim;
        vec[idx] += this.hash(`${tok}#${k}`) / 1e9 + 1;
      }
    }
    // Normalize to unit length (helps cosine distance stay bounded).
    let norm = 0;
    for (const v of vec) norm += v * v;
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < dim; i++) vec[i] /= norm;
    return vec;
  }

  private hash(s: string): number {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0) % 1e9;
  }
}
