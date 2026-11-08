/* E2E for the Orderwise AI intake pipeline (compiled against dist/).
 * Boots the real Nest app context (Prisma -> Postgres, BullMQ -> Redis, mock
 * LLM/embedding providers), seeds a WEB_CHAT channel + customer + conversation,
 * then drives AiService.handleInbound("mua 3 áo thun cotton") and asserts:
 *   - an OUTBOUND (origin AI) reply was created
 *   - an order (FROM_CONVERSATION) was created and is AWAITING_CUSTOMER_CONFIRM
 *   - the variant stock hold was placed (onHold > 0) and sellable dropped
 * Exits 0 with a PASS line, or 1 with details.
 */
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../dist/app.module');
const { AiService } = require('../dist/ai/ai.service');
const { PrismaClient } = require('@orderwise/prisma');

const prisma = new PrismaClient();

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const ai = app.get(AiService);

  const shop = await prisma.shop.findUnique({ where: { slug: 'demo-shop' } });
  if (!shop) throw new Error('demo-shop missing — run seed first');
  const variant = await prisma.productVariant.findFirst({
    where: { sku: 'TEE-COTTON-WHITE-L' },
    include: { inventory: true },
  });
  if (!variant) throw new Error('seed variant missing');

  const before = variant.inventory;
  const sellableBefore = before.onHand - before.onHold - before.stockedOut;

  // reset stock to a known baseline (idempotent across runs)
  await prisma.inventoryItem.upsert({
    where: { variantId: variant.id },
    update: { onHand: 20, onHold: 0, stockedOut: 0 },
    create: { shopId: shop.id, variantId: variant.id, onHand: 20 },
  });
  const baseline = await prisma.inventoryItem.findUnique({ where: { variantId: variant.id } });
  const baseHold = baseline.onHold; // 0
  const sellableBaseline = baseline.onHand - baseline.onHold - baseline.stockedOut; // 20

  // idempotent conversation for this test
  let conv = await prisma.conversation.findFirst({ where: { title: 'AI-E2E' } });
  if (!conv) {
    const customer = await prisma.customer.create({
      data: { shopId: shop.id, displayName: 'E2E Khách', identifiers: JSON.stringify({ WEB_CHAT: 'e2e-web' }) },
    });
    const channel = await prisma.channel.create({
      data: { shopId: shop.id, type: 'WEB_CHAT', name: 'E2E Web', providerId: 'e2e-chan', config: '{}' },
    });
    conv = await prisma.conversation.create({
      data: { shopId: shop.id, channelId: channel.id, customerId: customer.id, title: 'AI-E2E' },
    });
  }

  const reply = await ai.handleInbound({ shopId: shop.id, conversationId: conv.id, content: 'mua 3 áo thun cotton' });

  const replies = await prisma.message.findMany({
    where: { conversationId: conv.id, origin: 'AI', direction: 'OUTBOUND' },
    orderBy: { createdAt: 'desc' },
    take: 1,
  });
  const order = reply.orderId
    ? await prisma.order.findUnique({ where: { id: reply.orderId }, include: { items: true, holdings: true } })
    : null;
  const inv = await prisma.inventoryItem.findUnique({ where: { variantId: variant.id } });

  const checks = {
    aiReply: !!replies[0] && typeof replies[0].content === 'string',
    orderCreated: !!order && order.type === 'FROM_CONVERSATION',
    orderAwaiting: order?.status === 'AWAITING_CUSTOMER_CONFIRM',
    orderItems: order?.items?.length === 1 && order.items[0].quantity === 3,
    holdPlaced: !!inv && inv.onHold - baseHold === 3,
    sellableDropped: !!inv && (inv.onHand - inv.onHold - inv.stockedOut) === sellableBaseline - 3,
  };

  console.log('\n=== AI E2E RESULT ===');
  console.log('reply.text :', replies[0]?.content?.split('\n')[0] ?? '(none)');
  console.log('reply.order:', reply.orderId);
  console.log('order      :', order ? `${order.orderCode} ${order.status} items=${order.items.length}` : '(none)');
  console.log('stock      :', inv ? `onHand=${inv.onHand} onHold=${inv.onHold} stockedOut=${inv.stockedOut} sellable=${inv.onHand - inv.onHold - inv.stockedOut}` : '(none)');
  console.log('checks     :', JSON.stringify(checks, null, 2));

  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? '\n✅ AI E2E PASS' : '\n❌ AI E2E FAIL');
  await app.close();
  await prisma.$disconnect();
  process.exit(pass ? 0 : 1);
}

main().catch(async (e) => {
  console.error('E2E ERROR:', e);
  await prisma.$disconnect();
  process.exit(1);
});
