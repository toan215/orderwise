import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { OrdersService } from '../orders/orders.service';
import type { AiReply } from '../ai/ai.service';

/**
 * Public web-chat for a shop's customers (no JWT — the widget is anonymous).
 *
 * A visitor gets a random `token` (kept in their localStorage) that maps to a
 * shop-scoped Customer + Conversation. `start` get-or-creates the channel,
 * customer and conversation; `send` feeds the message into the AI pipeline and
 * returns the AI reply so the widget can render it immediately.
 */
@Injectable()
export class WebChatService {
  private readonly logger = new Logger(WebChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly orders: OrdersService,
  ) {}

  async start(shopSlug: string, token: string): Promise<{ conversationId: string; shopName: string; shopSlug: string }> {
    const shop = await this.prisma.shop.findUnique({ where: { slug: shopSlug } });
    if (!shop) throw new NotFoundException('Shop not found');

    // Web-chat channel: reuse an existing one for the shop, else create it.
    let channel = await this.prisma.channel.findFirst({
      where: { shopId: shop.id, type: 'WEB_CHAT' },
    });
    if (!channel) {
      channel = await this.prisma.channel.create({
        data: { shopId: shop.id, type: 'WEB_CHAT', name: 'Web chat', status: 'CONNECTED' },
      });
    }

    // Customer identified by the anonymous web-chat token.
    let customer = await this.prisma.customer.findFirst({
      where: { shopId: shop.id, identifiers: { path: ['WEB_CHAT'], string_contains: token } },
    });
    if (!customer) {
      customer = await this.prisma.customer.create({
        data: { shopId: shop.id, displayName: 'Khách web', identifiers: { WEB_CHAT: token } },
      });
    }

    // One live conversation per widget visitor.
    let conversation = await this.prisma.conversation.findFirst({
      where: { shopId: shop.id, customerId: customer.id, status: { not: 'CLOSED' } },
      orderBy: { updatedAt: 'desc' },
    });
    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          shopId: shop.id,
          channelId: channel.id,
          customerId: customer.id,
          status: 'OPEN',
          aiEnabled: true,
          title: 'Web chat',
          lastMessageAt: new Date(),
        },
      });
    }

    return { conversationId: conversation.id, shopName: shop.name, shopSlug: shop.slug };
  }

  async send(shopSlug: string, token: string, content: string): Promise<AiReply> {
    const { conversationId } = await this.start(shopSlug, token);
    const conv = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conv) throw new NotFoundException('Conversation not found');

    // Human-in-the-loop: if the seller took over, don't let the AI answer.
    if (!conv.aiEnabled) {
      await this.prisma.message.create({
        data: {
          conversationId,
          direction: 'INBOUND',
          origin: 'CUSTOMER',
          content,
          deliveryStatus: 'SENT',
          sentAt: new Date(),
        },
      });
      return { text: 'Cảm ơn bạn, nhân viên sẽ phản hồi trong giây lát.', intent: 'HANDED_OVER' as AiReply['intent'] };
    }

    return this.ai.handleInbound({ shopId: conv.shopId, conversationId, content });
  }

  async messages(shopSlug: string, token: string) {
    const shop = await this.prisma.shop.findUnique({ where: { slug: shopSlug } });
    if (!shop) throw new NotFoundException('Shop not found');
    const customer = await this.prisma.customer.findFirst({
      where: { shopId: shop.id, identifiers: { path: ['WEB_CHAT'], string_contains: token } },
    });
    if (!customer) return [];
    const conversation = await this.prisma.conversation.findFirst({
      where: { shopId: shop.id, customerId: customer.id, status: { not: 'CLOSED' } },
      orderBy: { updatedAt: 'desc' },
    });
    if (!conversation) return [];
    return this.prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      select: { id: true, direction: true, origin: true, content: true, createdAt: true },
    });
  }

  async confirmOrder(shopSlug: string, token: string, orderId: string) {
    const shop = await this.prisma.shop.findUnique({ where: { slug: shopSlug } });
    if (!shop) throw new NotFoundException('Shop not found');
    const customer = await this.prisma.customer.findFirst({
      where: { shopId: shop.id, identifiers: { path: ['WEB_CHAT'], string_contains: token } },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    const order = await this.prisma.order.findFirst({ where: { id: orderId, customerId: customer.id, shopId: shop.id } });
    if (!order) throw new NotFoundException('Order not found');

    // Convert holds -> stockedOut and move to AWAITING_SELLER_CONFIRM (real lifecycle).
    const detail = await this.orders.confirmByCustomer(shop.id, order.id, true);

    await this.prisma.message.create({
      data: {
        conversationId: order.conversationId!,
        direction: 'INBOUND',
        origin: 'CUSTOMER',
        content: 'Tôi xác nhận đơn hàng này.',
        deliveryStatus: 'SENT',
        sentAt: new Date(),
      },
    });
    return { ok: true, orderId: order.id, orderCode: order.orderCode, status: detail?.status };
  }
}
