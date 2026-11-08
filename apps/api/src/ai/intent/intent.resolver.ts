import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RagService } from '../rag/rag.service';

export interface ResolvedLine {
  variant: { id: string; name: string; price: number };
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export type ResolveOutcome =
  | { ok: true; lines: ResolvedLine[]; reasons?: string[] }
  | { ok: false; reasons: string[] };

/**
 * Turn the LLM's raw order lines into concrete shop variants, using RAG
 * retrieval + exact-match refinement so pricing/inventory are grounded in the
 * shop's actual catalog. Ambiguous or unmatchable lines are reported back so
 * the AI can ask the customer to clarify.
 */
@Injectable()
export class IntentResolver {
  private readonly logger = new Logger(IntentResolver.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rag: RagService,
  ) {}

  async resolve(shopId: string, rawLines: Array<{ description: string; quantity?: number }>): Promise<ResolveOutcome> {
    if (!rawLines?.length) return { ok: false, reasons: ['Không có món hàng nào được yêu cầu.'] };

    const lines: ResolvedLine[] = [];
    const reasons: string[] = [];

    for (const raw of rawLines) {
      const desc = raw.description?.trim();
      if (!desc) continue;

      // 1) Integrate the RAG top product hit for this line description.
      const ragHit = await this.rag.search(shopId, desc, { topK: 3 });
      let variant = ragHit.products[0];

      // 2) Exact-match refinement within the same shop (prefer exact SKU/name).
      if (guessSku(desc)) {
        const bySku = await this.prisma.productVariant.findFirst({
          where: { sku: guessSku(desc)!, product: { shopId } },
          include: { inventory: true },
        });
        if (bySku) variant = { id: bySku.id, kind: 'variant' as const, productId: bySku.productId, name: bySku.name, price: Number(bySku.price), sellable: bySku.inventory ? bySku.inventory.onHand - bySku.inventory.onHold - bySku.inventory.stockedOut : 0, distance: 0 };
      }

      if (!variant) {
        reasons.push(`Không tìm thấy sản phẩm "${raw.description}".`);
        continue;
      }

      const quantity = raw.quantity && raw.quantity > 0 ? raw.quantity : 1;
      const unitPrice = variant.price;
      lines.push({
        variant: { id: variant.id, name: variant.name, price: unitPrice },
        quantity,
        unitPrice,
        lineTotal: unitPrice * quantity,
      });
    }

    if (lines.length === 0) return { ok: false, reasons };
    if (reasons.length > 0) return { ok: true, lines, reasons }; // partial — caller decides
    return { ok: true, lines };
  }

  /** Sum sellable of each line & flag any that exceed stock (for pre-order checks). */
  shortages(shopId: string, lines: ResolvedLine[]): Promise<Array<{ name: string; needed: number; sellable: number }>> {
    return Promise.all(
      lines.map(async (l) => {
        const item = await this.prisma.inventoryItem.findUnique({ where: { variantId: l.variant.id } });
        const sellable = item ? item.onHand - item.onHold - item.stockedOut : 0;
        return sellable < l.quantity ? { name: l.variant.name, needed: l.quantity, sellable } : null;
      }),
    ).then((rows) => rows.filter((r): r is NonNullable<typeof r> => r !== null));
  }
}

function guessSku(desc: string): string | null {
  const m = desc.match(/\b[A-Z0-9]{2,}-[A-Z0-9-]{2,}\b/);
  return m ? m[0] : null;
}
