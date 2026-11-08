import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Prisma } from '@orderwise/prisma';
type Db = PrismaService | Prisma.TransactionClient;

export interface SellableResult {
  variantId: string;
  onHand: number;
  onHold: number;
  stockedOut: number;
  sellable: number;
}

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  /** sellable = onHand - onHold - stockedOut (computed from columns) */
  private sellableOf(i: { onHand: number; onHold: number; stockedOut: number }): number {
    return i.onHand - i.onHold - i.stockedOut;
  }

  async sellableByVariant(variantId: string): Promise<SellableResult | null> {
    const item = await this.prisma.inventoryItem.findUnique({ where: { variantId } });
    if (!item) return null;
    return { variantId, onHand: item.onHand, onHold: item.onHold, stockedOut: item.stockedOut, sellable: this.sellableOf(item) };
  }

  /**
   * Atomically place a hold for an order. Uses SELECT ... FOR UPDATE to prevent
   * overselling under concurrency (multiple customers at once). Creates a
   * StockHolding with expiry (awaiting-confirm TTL).
   * `db` lets callers run this inside their own outer transaction (no nested tx).
   */
  async hold(db: Db, variantId: string, orderId: string, quantity: number, holdTtlSec = 900) {
    const [inv] = await db.$queryRaw<
      { id: string; shopId: string; onHand: number; onHold: number; stockedOut: number }[]
    >`SELECT "id","shopId","onHand","onHold","stockedOut" FROM "InventoryItem" WHERE "variantId" = ${variantId} FOR UPDATE`;
    if (!inv) return { ok: false as const, reason: 'NO_INVENTORY' };

    const sellable = inv.onHand - inv.onHold - inv.stockedOut;
    if (sellable < quantity) return { ok: false as const, reason: 'INSUFFICIENT_STOCK', sellable };

    await db.inventoryItem.update({
      where: { variantId },
      data: { onHold: { increment: quantity } },
    });
    await db.stockHolding.create({
      data: {
        inventoryId: inv.id,
        orderId,
        quantity,
        expiresAt: new Date(Date.now() + holdTtlSec * 1000),
      },
    });
    await db.stockMovement.create({
      data: {
        shopId: inv.shopId,
        inventoryId: inv.id,
        type: 'ORDER_HOLD',
        quantity: -quantity,
        reason: 'ADJUSTMENT',
        refOrderId: orderId,
      },
    });
    return { ok: true as const };
  }

  /** Release a hold (order cancelled / expired) — returns stock to sellable. */
  async releaseHold(db: Db, holdingId: string) {
    const holding = await db.stockHolding.findUnique({ where: { id: holdingId } });
    if (!holding || holding.status !== 'ACTIVE') return { ok: false as const, reason: 'NOT_ACTIVE' };

    await db.inventoryItem.update({
      where: { id: holding.inventoryId },
      data: { onHold: { decrement: holding.quantity } },
    });
    await db.stockHolding.update({ where: { id: holdingId }, data: { status: 'RELEASED', releasedAt: new Date() } });
    return { ok: true as const };
  }

  /**
   * Convert a hold into a committed sale on order confirm:
   * moves qty from onHold to stockedOut (committed, no longer sellable).
   */
  async convertHold(db: Db, holdingId: string) {
    const holding = await db.stockHolding.findUnique({ where: { id: holdingId } });
    if (!holding || holding.status !== 'ACTIVE') return { ok: false as const, reason: 'NOT_ACTIVE' };

    await db.inventoryItem.update({
      where: { id: holding.inventoryId },
      data: { onHold: { decrement: holding.quantity }, stockedOut: { increment: holding.quantity } },
    });
    await db.stockHolding.update({ where: { id: holdingId }, data: { status: 'CONVERTED' } });
    return { ok: true as const };
  }

  /** Reconcile sellable quantity after delivery (stock physically leaves). */
  async reduceOnHand(db: Db, variantId: string, quantity: number) {
    await db.inventoryItem.updateMany({
      where: { variantId, stockedOut: { gte: quantity } },
      data: { stockedOut: { decrement: quantity }, onHand: { decrement: quantity } },
    });
  }
}
