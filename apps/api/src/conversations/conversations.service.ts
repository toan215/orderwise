import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChannelsService } from '../channels/channels.service';
import { ShopContext } from '../common/shop-context';

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly channels: ChannelsService,
  ) {}

  list(shopId: string, opts: { status?: string; q?: string; channelId?: string }) {
    return this.prisma.conversation.findMany({
      where: {
        shopId,
        ...(opts.channelId ? { channelId: opts.channelId } : {}),
        ...(opts.status
          ? { status: opts.status as any }
          : { status: { not: 'CLOSED' } }),
        ...(opts.q
          ? {
              OR: [
                { customer: { displayName: { contains: opts.q } } },
                { customer: { phone: { contains: opts.q } } },
              ],
            }
          : {}),
      },
      include: {
        customer: true,
        channel: { select: { id: true, name: true, type: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { lastMessageAt: 'desc' },
    });
  }

  async detail(shopId: string, convId: string) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id: convId, shopId },
      include: { customer: true, channel: true },
    });
    if (!conv) throw new NotFoundException('Conversation not found');
    return conv;
  }

  messages(shopId: string, convId: string) {
    return this.prisma.message.findMany({
      where: { conversationId: convId, conversation: { shopId } },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Seller replies directly from the admin UI. */
  async sendAsSeller(ctx: ShopContext, convId: string, content: string) {
    const conv = await this.detail(ctx.shopId, convId);
    const msg = await this.prisma.message.create({
      data: {
        conversationId: convId,
        direction: 'OUTBOUND',
        origin: 'SELLER',
        senderId: ctx.user.id,
        content,
      },
    });
    // Attempt to push through the channel adapter (best-effort; delivery retry queue later).
    const adapter = this.channels.get(conv.channel.type);
    let delivery = 'PENDING';
    if (adapter && conv.customer) {
      try {
        const identifiers = (conv.customer.identifiers as any) ?? {};
        const res = await adapter.send({
          channelConfig: conv.channel.config as any,
          recipientId: identifiers[conv.channel.type] ?? conv.customer.id,
          content,
        });
        delivery = res.ok ? 'SENT' : 'FAILED';
      } catch {
        delivery = 'FAILED';
      }
      await this.prisma.message.update({
        where: { id: msg.id },
        data: { deliveryStatus: delivery as any, sentAt: new Date() },
      });
    }
    return this.prisma.message.findUnique({ where: { id: msg.id } });
  }

  /** Human-in-the-loop: seller takes over, AI paused. */
  async takeOver(ctx: ShopContext, convId: string) {
    await this.prisma.conversation.update({
      where: { id: convId },
      data: { status: 'HANDED_OVER', assignedToId: ctx.user.id, aiEnabled: false },
    });
    await this.prisma.handoff.updateMany({
      where: { conversationId: convId, status: 'PENDING' },
      data: { status: 'ASSIGNED', assignedToId: ctx.user.id },
    });
    return this.detail(ctx.shopId, convId);
  }

  setAiEnabled(ctx: ShopContext, convId: string, enabled: boolean) {
    return this.prisma.conversation.update({
      where: { id: convId },
      data: { aiEnabled: enabled, status: enabled ? 'OPEN' : 'PAUSED' },
    });
  }
}
