import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { EmbeddingProvider } from '../embedding/embedding.types';
import { EMBEDDING_PROVIDER } from '../ai.tokens';

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface CatalogHit {
  kind: 'variant';
  id: string;
  productId: string;
  name: string;
  sku?: string | null;
  price: number;
  sellable: number;
  distance: number | null;
}

export interface RagResult {
  products: CatalogHit[];
  faqs: Array<{ id: string; question: string; answer: string; distance: number | null }>;
  policies: Array<{ id: string; title: string; content: string; distance: number | null }>;
}

/**
 * RAG over the catalog (product variants), policies and FAQs using pgvector.
 * The vector column is Unsupported in Prisma, so all vector I/O goes through
 * raw SQL ($queryRaw). Retrieval is hybrid: pgvector cosine search, with a
 * lexical (ILIKE) fallback so results stay correct even when the embedding
 * provider is the deterministic mock.
 */
@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private readonly dim: number;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(EMBEDDING_PROVIDER) private readonly embedder: EmbeddingProvider,
  ) {
    this.dim = embedder.dimensions;
  }

  /** Embed a keyword query and fetch candidates by cosine similarity. */
  async search(shopId: string, query: string, opts: { topK?: number } = {}): Promise<RagResult> {
    const topK = opts.topK ?? 4;
    const empty: RagResult = { products: [], faqs: [], policies: [] };
    if (!query.trim()) return empty;

    // Vector path: only meaningful when the embedder produces stable vectors.
    try {
      const [vec] = await this.embedder.embed([query]);
      if (vec && vec.length === this.dim) {
        const vecLit = `[${vec.map((v) => v.toFixed(6)).join(',')}]`;
        const [variants, faqs, policies] = await Promise.all([
          this.prisma.$queryRawUnsafe<CatalogHit[]>(
            `SELECT v."id", v."productId", v."name", v."sku",
                    (v."price"::text)::float8 AS price,
                    COALESCE(i."onHand" - i."onHold" - i."stockedOut", 0) AS sellable,
                    (ve."vector" <=> '${vecLit}'::vector) AS distance
             FROM "VariantEmbedding" ve
             JOIN "ProductVariant" v ON v."id" = ve."variantId"
             LEFT JOIN "InventoryItem" i ON i."variantId" = v."id"
             WHERE v."productId" IN (SELECT "id" FROM "Product" WHERE "shopId" = '${this.escape(shopId)}')
               AND v."active" = true
             ORDER BY ve."vector" <=> '${vecLit}'::vector
             LIMIT ${topK * 2}`,
          ),
          this.prisma.$queryRawUnsafe<any[]>(
            `SELECT f."id", f."question", f."answer", (fe."vector" <=> '${vecLit}'::vector) AS distance
             FROM "FAQEmbedding" fe JOIN "FAQEntry" f ON f."id" = fe."faqId"
             WHERE f."shopId" = '${this.escape(shopId)}' AND f."active" = true
             ORDER BY fe."vector" <=> '${vecLit}'::vector LIMIT ${topK}`,
          ),
          this.prisma.$queryRawUnsafe<any[]>(
            `SELECT p."id", p."title", p."content", (pe."vector" <=> '${vecLit}'::vector) AS distance
             FROM "PolicyEmbedding" pe JOIN "Policy" p ON p."id" = pe."policyId"
             WHERE p."shopId" = '${this.escape(shopId)}' AND p."active" = true
             ORDER BY pe."vector" <=> '${vecLit}'::vector LIMIT ${topK}`,
          ),
        ]);
        const result = {
          products: variants.map((v) => ({ ...v, kind: 'variant' as const, price: Number(v.price ?? 0), sellable: Number(v.sellable ?? 0) })),
          faqs: faqs.map((f) => ({ ...f, distance: f.distance == null ? null : Number(f.distance) })),
          policies: policies.map((p) => ({ ...p, distance: p.distance == null ? null : Number(p.distance) })),
        };
        // Cold start: no embeddings indexed yet (zero vectors). Fall back so
        // retrieval still works before the EMBEDDING worker has run.
        if (result.products.length === 0) return this.lexicalSearch(shopId, query, topK);
        return result;
      }
    } catch (err) {
      this.logger.warn(`vector search failed, using lexical only: ${String(err).slice(0, 200)}`);
    }
    return this.lexicalSearch(shopId, query, topK);
  }

  /** ILIKE fallback — keeps retrieval correct regardless of embedder quality. */
  private async lexicalSearch(shopId: string, query: string, topK: number): Promise<RagResult> {
    const tokens = query.toLowerCase().split(/\s+/).filter((t) => t.length > 1).slice(0, 6);
    if (tokens.length === 0) return { products: [], faqs: [], policies: [] };

    // Positional placeholders start at $2 (after shopId is $1).
    const where = (col: string) => tokens.map((_, i) => `${col} ILIKE '%' || $${i + 2} || '%'`).join(' OR ');
    const props = tokens;

    const [variants, faqs, policies] = await Promise.all([
      this.prisma.$queryRawUnsafe<CatalogHit[]>(
        `SELECT v."id", v."productId", v."name", v."sku",
                (v."price"::text)::float8 AS price,
                COALESCE(i."onHand" - i."onHold" - i."stockedOut", 0) AS sellable,
                NULL::float8 AS distance
         FROM "ProductVariant" v
         JOIN "Product" p ON p."id" = v."productId"
         LEFT JOIN "InventoryItem" i ON i."variantId" = v."id"
         WHERE p."shopId" = $1 AND p."active" = true
           AND v."active" = true
           AND (${where('v."name"')} OR ${where('p."name"')} OR ${where('v."sku"')} OR ${where('p."sku"')} OR ${where('p."description"')})
         ORDER BY v."name" LIMIT ${topK}`,
        shopId, ...props,
      ),
      this.prisma.$queryRawUnsafe<any[]>(
        `SELECT f."id", f."question", f."answer", NULL::float8 AS distance
         FROM "FAQEntry" f
         WHERE f."shopId" = $1 AND f."active" = true AND (${where('f."question"')}) LIMIT ${topK}`,
        shopId, ...props,
      ),
      this.prisma.$queryRawUnsafe<any[]>(
        `SELECT p."id", p."title", p."content", NULL::float8 AS distance
         FROM "Policy" p
         WHERE p."shopId" = $1 AND p."active" = true AND (${where('p."title"')}) LIMIT ${topK}`,
        shopId, ...props,
      ),
    ]);
    return {
      products: variants.map((v) => ({ ...v, kind: 'variant' as const, sellable: Number(v.sellable ?? 0) })),
      faqs: faqs.map((f) => ({ ...f, distance: null })),
      policies: policies.map((p) => ({ ...p, distance: null })),
    };
  }

  /** Index/refresh a product variant's embedding (content = name + sku + options). */
  async indexVariant(variantId: string): Promise<void> {
    const v = await this.prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!v) return;
    const content = [v.name, v.sku, v.name].filter(Boolean).join(' · ');
    const [vec] = await this.embedder.embed([content]);
    const vecLit = `[${vec.map((x) => x.toFixed(6)).join(',')}]`;
    const hash = this.sum(content);
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO "VariantEmbedding" ("id","variantId","model","contentHash","vector","content","updatedAt")
       VALUES ('${cuid()}','${v.id}','${this.embedder.name}','${hash}','${vecLit}'::vector,'${this.escape(content)}', now())
       ON CONFLICT ("variantId","model") DO UPDATE SET
         "contentHash" = EXCLUDED."contentHash", "vector" = EXCLUDED."vector",
         "content" = EXCLUDED."content", "updatedAt" = now()`,
    );
  }

  private escape(s: string): string {
    return s.replace(/'/g, "''");
  }
  private sum(s: string): string {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return `${h >>> 0}`;
  }
}

function cuid(): string {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}
