import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RagService } from './rag/rag.service';
import { IntentResolver } from './intent/intent.resolver';
import { OrdersService } from '../orders/orders.service';
import { ChannelsService } from '../channels/channels.service';
import type { LlmProvider } from './llm/llm.types';
import { SocketGateway } from '../conversations/socket.gateway';
import type { OrderExtraction } from './llm/llm.types';
import { AiWorkers } from './workers/ai.workers';
import { LLM_PROVIDER } from './ai.tokens';

export interface InboundMessage {
  shopId: string;
  conversationId: string;
  content: string;
  /** Who said it — always CUSTOMER for the AI intake path. */
  origin?: 'CUSTOMER';
  providerMsgId?: string;
}

export interface AiReply {
  text: string;
  orderId?: string;
  intent: OrderExtraction['intent'];
  messageId?: string;
}

/**
 * The AI intake pipeline. For each inbound customer message:
 *   1. archive it (Message INBOUND, origin CUSTOMER)
 *   2. build the conversation so the AI has context (catalog sample + recent msgs)
 *   3. LLM extraction -> raw intent
 *   4. resolve raw lines to concrete variants (RAG + exact SKU)
 *   5. check stock / ask for missing info
 *   6. create a DRAFT order + request customer confirm (stock holds placed)
 *   7. reply to the customer (Message OUTBOUND, origin AI) + Socket.IO push
 *
 * Rethrows a small Error with a friendly customer text on business failures.
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rag: RagService,
    private readonly resolver: IntentResolver,
    private readonly orders: OrdersService,
    private readonly channels: ChannelsService,
    @Inject(LLM_PROVIDER) private readonly llm: LlmProvider,
    private readonly workers: AiWorkers,
    @Optional() private readonly socket?: SocketGateway,
  ) {}

  async handleInbound(msg: InboundMessage): Promise<AiReply> {
    const { shopId, conversationId, content } = msg;

    // 1) Archive inbound message.
    const customerMsg = await this.prisma.message.create({
      data: {
        conversationId,
        direction: 'INBOUND',
        origin: 'CUSTOMER',
        content,
        providerMsgId: msg.providerMsgId,
        deliveryStatus: 'SENT',
        sentAt: new Date(),
      },
    });
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date(), status: 'OPEN' },
    });

    // 2) Ask the LLM to extract the intent (mock or real provider).
    const extraction = await this.extract(shopId, conversationId, content);

    // 3) Non-order intents get a grounded answer (catalog/FAQ/policy) and return.
    if (extraction.intent !== 'PLACE_ORDER') {
      const text = await this.answerNonOrder(shopId, conversationId, extraction, content);
      return this.replyCustomer({ ...msg, conversationId }, text, extraction.intent);
    }

    // 4) Resolve lines -> variants.
    const resolved = await this.resolver.resolve(shopId, extraction.rawLines ?? []);
    if (!resolved.ok) {
      const text = 'Mình chưa hiểu rõ bạn muốn mua gì. Bạn có thể cho mình biết tên sản phẩm và số lượng để mình ưu tiên giúp nhé? ' +
        resolved.reasons.join(' ');
      return this.replyCustomer({ ...msg, conversationId }, text, 'PLACE_ORDER');
    }

    // 5) Validate stock before touching an order.
    const shortages = await this.resolver.shortages(shopId, resolved.lines);
    if (shortages.length > 0) {
      const text = shortages.map((s) => `"${s.name}" chỉ còn ${s.sellable} (bạn cần ${s.needed})`).join('; ') +
        '. Bạn cần thêm sản phẩm khác hay giảm số lượng không?';
      return this.replyCustomer({ ...msg, conversationId }, text, 'PLACE_ORDER');
    }

    // 6) Create draft order + request customer confirm (holds stock).
    const customerInfo = extraction.customerInfo ?? {};
    const order = await this.orders.create(shopId, {
      type: 'FROM_CONVERSATION',
      conversationId,
      customerId: await this.ordersCustomerId(shopId, conversationId),
      customerName: customerInfo.name,
      customerPhone: customerInfo.phone,
      shippingAddress: customerInfo.address ?? extraction.deliveryInfo?.address,
      createdById: undefined,
      items: resolved.lines.map((l) => ({ variantId: l.variant.id, quantity: l.quantity, unitPrice: l.unitPrice })),
    });
    if (!order) throw new Error('create order returned nothing');
    await this.orders.requestCustomerConfirm(shopId, order.id);
    // Deterministic expiry at TTL (sweep catches strays).
    if (order.orderTimeoutAt) {
      await this.workers.scheduleHoldTimeout(order.id, Math.max(0, order.orderTimeoutAt.getTime() - Date.now())).catch(() => undefined);
    }

    // Log intent steps (audit for the dashboard).
    await this.logIntent(shopId, conversationId, extraction, resolved, order.id);

    const money = (n: number) => n.toLocaleString('vi-VN') + 'đ';
    const ol = order!;
    const lines = resolved.lines.map((l) => `• ${l.variant.name} ×${l.quantity} = ${money(l.lineTotal)}`).join('\n');
    const text =
      `Mình đã chốt đơn bạn xem lại nhé (đơn **${ol.orderCode}**):\n${lines}\n` +
      `Tổng cộng: **${money(Number(ol.total))}**\n` +
      'Bạn xác nhận đơn này giúp mình nhé? Mình sẽ giữ hàng 15 phút để bạn chốt.';

    this.socket?.emitToShop(shopId, 'ai:order-draft', { conversationId, orderId: ol.id, orderCode: ol.orderCode });
    return this.replyCustomer({ ...msg, conversationId }, text, 'PLACE_ORDER', order.id);
  }

  /** LLM extraction with context: recent messages + a catalog sample. */
  private async extract(shopId: string, conversationId: string, content: string): Promise<OrderExtraction> {
    const recent = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: { direction: true, origin: true, content: true },
    });
    const lines = `[${recent.reverse().map((m) => `"${m.origin}: ${m.content}"`).join(', ')}]`;
    const catalog = (await this.rag.search(shopId, content, { topK: 3 })).products
      .map((p) => `${p.name} (${p.sku ?? 'no-sku'}) · ${p.price.toLocaleString('vi-VN')}đ · còn ${p.sellable}`)
      .join('\n');

    const res = await this.llm.complete({
      messages: [
        {
          role: 'system',
          content:
            'Bạn là trợ lý bán hàng của cửa hàng. Nếu khách có ý định đặt hàng, hãy trích xuất JSON theo schema OrderExtraction: ' +
            '{ intent: "PLACE_ORDER", customerInfo:{name?,phone?,address?}, rawLines:[{description,quantity?,unit?}], deliveryInfo?:{note?,address?}, question? }. ' +
            'Chỉ trả về JSON, không thêm văn bản. Nếu chỉ hỏi thông tin, intent = "ASK_CATALOG"/"ASK_FAQ" và question = câu hỏi.',
        },
        { role: 'user', content: `Tin nhắn khách: ${content}\n\nHội thoại gần: ${lines}` },
      ],
      temperature: 0,
    });
    try {
      return JSON.parse(stripJsonFence(res.content)) as OrderExtraction;
    } catch {
      // Fallback: treat the whole content as a raw line so the pipeline still works.
      return { intent: 'PLACE_ORDER', rawLines: [{ description: content, quantity: undefined }] };
    }
  }

  private async answerNonOrder(shopId: string, conversationId: string, ext: OrderExtraction, content: string): Promise<string> {
    const query = ext.question || content;
    const rag = await this.rag.search(shopId, query, { topK: 3 });
    if (ext.intent === 'ASK_FAQ' && rag.faqs[0]) return `📌 ${rag.faqs[0].question}\n${rag.faqs[0].answer}`;
    if (ext.intent === 'ASK_CATALOG' && rag.products[0]) {
      const p = rag.products[0];
      return `Mình có **${p.name}** giá ${p.price.toLocaleString('vi-VN')}đ, hiện còn ${p.sellable} cái. Bạn có muốn đặt không ạ?`;
    }
    if (rag.policies[0]) return `Theo chính sách của shop:\n${rag.policies[0].content}`;
    return 'Mình có thể giúp bạn tư vấn sản phẩm, giá cả và đặt hàng. Bạn đang muốn mua gì ạ?';
  }

  private async ordersCustomerId(shopId: string, conversationId: string): Promise<string | undefined> {
    const conv = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    return conv?.customerId ?? undefined;
  }

  private async logIntent(shopId: string, conversationId: string, ext: OrderExtraction, resolved: { lines: { variant: { id: string }; quantity: number }[] }, orderId: string) {
    const intent = await this.prisma.intent.create({
      data: {
        conversationId,
        status: 'COMPLETE',
        payload: JSON.stringify({
          customerInfo: ext.customerInfo ?? {},
          rawLines: ext.rawLines ?? [],
          resolvedLines: resolved.lines,
        }),
        extractedJson: JSON.stringify(ext),
      },
    });
    await this.prisma.intentStep.create({
      data: { intentId: intent.id, kind: 'ORDER_CREATE', completed: true, output: JSON.stringify({ orderId }) },
    });
  }

  private async replyCustomer(msg: InboundMessage, text: string, intent: OrderExtraction['intent'], orderId?: string): Promise<AiReply> {
    const created = await this.prisma.message.create({
      data: { conversationId: msg.conversationId, direction: 'OUTBOUND', origin: 'AI', content: text, deliveryStatus: 'SENT', sentAt: new Date() },
    });
    // Best-effort push through the channel adapter (delivery retry worker picks up failures later).
    void this.pushToProvider(msg, created.id, text).catch(() => undefined);
    this.socket?.emitToShop(msg.shopId, 'message:new', { conversationId: msg.conversationId, message: created });
    return { text, orderId, intent, messageId: created.id };
  }

  private async pushToProvider(msg: InboundMessage, messageId: string, text: string) {
    const conv = await this.prisma.conversation.findUnique({ where: { id: msg.conversationId }, include: { channel: true, customer: true } });
    if (!conv?.channel) return;
    const adapter = this.channels.get(conv.channel.type);
    const identifiers = (conv.customer?.identifiers as any) ?? {};
    const recipientId = identifiers[conv.channel.type] ?? conv.customer?.id;
    if (!adapter || !recipientId) return;
    const res = await adapter.send({ channelConfig: conv.channel.config as any, recipientId, content: text });
    await this.prisma.message.update({
      where: { id: messageId },
      data: { deliveryStatus: res.ok ? 'SENT' : 'FAILED', providerMsgId: res.providerMsgId },
    });
  }
}

export function stripJsonFence(s: string): string {
  const m = s.trim().match(/```(?:json)?\s*([\s\S]*?)```/);
  return (m?.[1] ?? s).trim();
}
