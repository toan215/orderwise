import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import type { Tx } from '../prisma/tx';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
  ) {}

  /**
   * Next per-shop order code, e.g. OW-00001.
   * MUST run inside the create transaction after a per-shop advisory xact lock
   * (see create), otherwise concurrent order creation on the same shop races:
   * two transactions read the same max+1, bump a unique(orderCode) 23505 and 500.
   */
  private async nextCode(tx: Tx, shopId: string): Promise<string> {
    const last = await tx.order.findFirst({
      where: { shopId },
      orderBy: { orderCode: 'desc' },
      select: { orderCode: true },
    });
    const n = last ? parseInt(last.orderCode.split('-')[1] ?? '0', 10) + 1 : 1;
    return `OW-${String(n).padStart(5, '0')}`;
  }

  /** Create a DRAFT order (manual or from conversation) — no stock effects. */
  async create(shopId: string, dto: OrderCreateDto) {
    let orderId: string | undefined;
    await this.prisma.$transaction(async (tx) => {
      // Serialize per-shop order-code allocation: holds an advisory xact lock so the
      // max+1 read inside nextCode is race-free under concurrent multi-channel load
      // (different shops lock independently and still run in parallel).
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${shopId}, 0))`;
      const code = await this.nextCode(tx, shopId);
      const order = await tx.order.create({
        data: {
          orderCode: code,
          shopId,
          type: dto.type ?? 'MANUAL',
          conversationId: dto.conversationId,
          customerId: dto.customerId,
          status: 'DRAFT',
          subtotal: 0,
          total: 0,
          createdById: dto.createdById,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          shippingAddress: dto.shippingAddress,
        },
      });
      orderId = order.id;
      for (const line of dto.items ?? []) {
        await this.addDraftLine(tx, shopId, order.id, line);
      }
    });
    // detail after commit so includes reflect persisted state
    return this.detail(shopId, orderId!);
  }

  /** Add/edit a draft line with fresh pricing + availability check. */
  private async addDraftLine(tx: Tx, shopId: string, orderId: string, line: OrderLineDto) {
    const existing = await tx.orderItem.findUnique({
      where: { orderId_variantId: { orderId, variantId: line.variantId } },
    });
    const variant = await tx.productVariant.findFirst({
      where: { id: line.variantId, product: { shopId } },
    });
    if (!variant) throw new BadRequestException('Variant not found in shop');

    const quantity = existing ? existing.quantity + (line.quantity ?? 1) : (line.quantity ?? 1);
    const unitPrice = Number(line.unitPrice ?? variant.price);

    const item = await tx.orderItem.upsert({
      where: { orderId_variantId: { orderId, variantId: line.variantId } },
      update: { quantity, unitPrice, lineTotal: unitPrice * quantity },
      create: {
        orderId,
        variantId: line.variantId,
        productId: variant.productId,
        name: variant.name,
        sku: variant.sku,
        unitPrice,
        quantity,
        lineTotal: unitPrice * quantity,
      },
    });
    await this.recalc(tx, orderId);
    return item;
  }

  private async recalc(tx: Tx, orderId: string) {
    const items = await tx.orderItem.findMany({ where: { orderId } });
    const subtotal = items.reduce((s: number, i) => s + Number(i.lineTotal), 0);
    const shippingFee = 0;
    const discount = 0;
    const total = subtotal + shippingFee - discount;
    await tx.order.update({
      where: { id: orderId },
      data: { subtotal, shippingFee, discount, total },
    });
  }

  async addLine(shopId: string, orderId: string, line: OrderLineDto) {
    await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({ where: { id: orderId, shopId } });
      if (!order) throw new NotFoundException('Order not found');
      await this.addDraftLine(tx, shopId, orderId, line);
    });
    return this.detail(shopId, orderId);
  }

  async removeLine(shopId: string, orderId: string, variantId: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.orderItem.deleteMany({ where: { orderId, variantId, order: { shopId, status: 'DRAFT' } } });
      await this.recalc(tx, orderId);
    });
    return this.detail(shopId, orderId);
  }

  /**
   * Move order to AWAITING_CUSTOMER_CONFIRM and place stock holds, so the
   * customer has TTL to confirm within which stock is reserved (prevents
   * concurrent overselling). Idempotent per order.
   */
  async requestCustomerConfirm(shopId: string, orderId: string) {
    await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({ where: { id: orderId, shopId } });
      if (!order) throw new NotFoundException('Order not found');
      if (order.status !== 'DRAFT') throw new BadRequestException('Order must be DRAFT');

      const items = await tx.orderItem.findMany({ where: { orderId } });
      for (const item of items) {
        if (!item.variantId) continue;
        const res = await this.inventory.hold(tx, item.variantId, orderId, item.quantity);
        if (!res.ok) throw new BadRequestException('Insufficient stock for ' + item.name);
      }
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'AWAITING_CUSTOMER_CONFIRM',
          orderTimeoutAt: new Date(Date.now() + 15 * 60_000), // 15 min
        },
      });
    });
    return this.detail(shopId, orderId);
  }

  /** Customer confirms requirement -> convert holds, mark awaiting seller check. */
  async confirmByCustomer(shopId: string, orderId: string, accepted: boolean) {
    await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({ where: { id: orderId, shopId } });
      if (!order) throw new NotFoundException('Order not found');
      if (order.status !== 'AWAITING_CUSTOMER_CONFIRM') throw new BadRequestException('Invalid state');

      if (!accepted) {
        await tx.order.update({
          where: { id: orderId },
          data: { status: 'DRAFT', orderTimeoutAt: null },
        });
        const holdings = await tx.stockHolding.findMany({ where: { orderId, status: 'ACTIVE' } });
        for (const h of holdings) await this.inventory.releaseHold(tx, h.id);
        return;
      }

      const holdings = await tx.stockHolding.findMany({ where: { orderId, status: 'ACTIVE' } });
      for (const h of holdings) await this.inventory.convertHold(tx, h.id);
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'AWAITING_SELLER_CONFIRM', customerConfirmAt: new Date(), orderTimeoutAt: null },
      });
    });
    return this.detail(shopId, orderId);
  }

  /** Seller confirms -> CONFIRMED. */
  async confirm(shopId: string, orderId: string) {
    await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({ where: { id: orderId, shopId } });
      if (!order) throw new NotFoundException('Order not found');
      if (order.status !== 'AWAITING_SELLER_CONFIRM') throw new BadRequestException('Order not awaiting seller confirm');
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'CONFIRMED', confirmedAt: new Date() },
      });
    });
    return this.detail(shopId, orderId);
  }

  /** Cancel: release active holds AND return committed (converted) qty to sellable. */
  async cancel(shopId: string, orderId: string, reason: string, note?: string) {
    await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({ where: { id: orderId, shopId } });
      if (!order) throw new NotFoundException('Order not found');
      // Active holds (draft/awaiting-confirm) — release onHold back to sellable.
      const active = await tx.stockHolding.findMany({ where: { orderId, status: 'ACTIVE' } });
      for (const h of active) await this.inventory.releaseHold(tx, h.id);
      // Converted holdings (order was confirmed) — if not yet shipped, un-commit
      // stockedOut: move qty back from stockedOut to sellable.
      const converted = await tx.stockHolding.findMany({ where: { orderId, status: 'CONVERTED' } });
      for (const h of converted) {
        const inv = await tx.inventoryItem.findUnique({ where: { id: h.inventoryId } });
        if (inv && inv.stockedOut >= h.quantity) {
          await tx.inventoryItem.update({
            where: { id: h.inventoryId },
            data: { stockedOut: { decrement: h.quantity } },
          });
          await tx.stockMovement.create({
            data: {
              shopId,
              inventoryId: h.inventoryId,
              type: 'CANCEL_RELEASE',
              quantity: h.quantity,
              reason: 'ADJUSTMENT',
              refOrderId: orderId,
            },
          });
          await tx.stockHolding.update({ where: { id: h.id }, data: { status: 'RELEASED', releasedAt: new Date() } });
        }
      }
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED', cancelReason: reason as any, cancelNote: note, cancelledAt: new Date() },
      });
    });
    return this.detail(shopId, orderId);
  }

  detail(shopId: string, orderId: string) {
    return this.prisma.order.findFirst({
      where: { id: orderId, shopId },
      include: { items: true, holdings: true, history: { orderBy: { createdAt: 'desc' } } },
    });
  }

  list(shopId: string, status?: string, q?: string) {
    return this.prisma.order.findMany({
      where: {
        shopId,
        ...(status ? { status: status as any } : {}),
        ...(q ? { OR: [{ orderCode: { contains: q, mode: 'insensitive' } }, { customerName: { contains: q } }] } : {}),
      },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export interface OrderLineDto {
  variantId: string;
  quantity?: number;
  unitPrice?: number;
}

export interface OrderCreateDto {
  type?: 'MANUAL' | 'FROM_CONVERSATION';
  conversationId?: string;
  customerId?: string;
  createdById?: string;
  customerName?: string;
  customerPhone?: string;
  shippingAddress?: string;
  items?: OrderLineDto[];
}
