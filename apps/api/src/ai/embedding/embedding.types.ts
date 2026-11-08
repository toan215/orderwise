/** Embedding provider contract — returns a fixed-dim vector for a text chunk. */

export interface EmbeddingProvider {
  readonly name: string;
  readonly dimensions: number;
  embed(texts: string[]): Promise<number[][]>;
}
