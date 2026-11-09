/* RQ1 — Độ chính xác trích xuất đơn từ hội thoại tiếng Việt.
 * Chạy pipeline AI thật (boot Nest app context + Prisma), mỗi case một hội thoại,
 * so sánh đầu ra (có tạo đơn hay không, đúng variant + đúng qty) với nhãn kỳ vọng.
 * Chạy: node scripts/research/rq1-eval.js  (cần đã build: pnpm --filter @orderwise/api build)
 */
const fs = require('fs');
const path = require('path');
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../../dist/app.module');
const { AiService } = require('../../dist/ai/ai.service');
const { PrismaClient } = require('@orderwise/prisma');

const prisma = new PrismaClient();
const SKU = 'TEE-COTTON-WHITE-L';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const ai = app.get(AiService);

  const shop = await prisma.shop.findUnique({ where: { slug: 'demo-shop' } });
  if (!shop) throw new Error('demo-shop missing — run seed first');
  const variant = await prisma.productVariant.findFirst({ where: { sku: SKU } });
  if (!variant) throw new Error('seed variant missing');

  // reset stock generous so all ordered qty (<=10) can be held
  await prisma.inventoryItem.upsert({
    where: { variantId: variant.id },
    update: { onHand: 100, onHold: 0, stockedOut: 0 },
    create: { shopId: shop.id, variantId: variant.id, onHand: 100 },
  });

  const channel = await prisma.channel.upsert({
    where: { id: 'rq1-channel' },
    update: {},
    create: { id: 'rq1-channel', shopId: shop.id, type: 'WEB_CHAT', name: 'RQ1', status: 'CONNECTED' },
  });

  const dataset = JSON.parse(fs.readFileSync(path.join(__dirname, 'rq1-dataset.json'), 'utf8'));
  const rows = [];

  for (const c of dataset.cases) {
    const customer = await prisma.customer.create({
      data: { shopId: shop.id, displayName: 'RQ1', identifiers: { WEB_CHAT: `rq1-${c.id}` } },
    });
    const conv = await prisma.conversation.create({
      data: { shopId: shop.id, channelId: channel.id, customerId: customer.id, title: `RQ1-${c.id}`, status: 'OPEN', aiEnabled: true },
    });

    let result;
    try {
      result = await ai.handleInbound({ shopId: shop.id, conversationId: conv.id, content: c.message });
    } catch (e) {
      result = { orderId: undefined, error: String(e.message || e) };
    }

    // read created order
    let order = null;
    if (result.orderId) {
      order = await prisma.order.findUnique({ where: { id: result.orderId }, include: { items: { include: { variant: true } } } });
    }

    const created = !!order;
    let ok = true;
    let detail = 'created';
    if (c.expectOrder) {
      if (!created) { ok = false; detail = 'MISS: không tạo đơn (kỳ vọng tạo)'; }
      else if (order.items.length !== 1) { ok = false; detail = `items=${order.items.length}`; }
      else {
        const it = order.items[0];
        const qtyOk = it.quantity === c.expectQty;
        const skuOk = it.variant.sku === SKU;
        if (!qtyOk || !skuOk) {
          ok = false;
          detail = `qty=${it.quantity} (expect ${c.expectQty}) sku=${it.variant.sku}`;
        }
      }
    } else {
      if (created) { ok = false; detail = `FALSE-POSITIVE: tạo đơn (${order.orderCode}) khi không nên`; }
      else detail = 'correct-refusal (không tạo đơn)';
    }

    rows.push({ id: c.id, message: trunc(c.message, 42), expectOrder: !!c.expectOrder, qty: c.expectQty, created, ok, detail });
  }

  const total = rows.length;
  const goldOrders = rows.filter((r) => r.expectOrder).length;
  const createdOrders = rows.filter((r) => r.created).length;
  const correctOrders = rows.filter((r) => r.expectOrder && r.ok).length;
  const correctRefusals = rows.filter((r) => !r.expectOrder && r.ok).length;
  const falsePositive = rows.filter((r) => !r.expectOrder && r.created).length;
  const falseNegative = rows.filter((r) => r.expectOrder && !r.created).length;
  const qtyWrong = rows.filter((r) => r.expectOrder && r.created && !r.ok).length;
  const decisionAcc = (correctOrders + correctRefusals) / total;

  console.log('\n================= RQ1 — TRÍCH XUẤT ĐƠN =================');
  console.table(rows.map(({ id, message, expectOrder, qty, created, ok, detail }) => ({ id, expectOrder, qty: qty ?? '-', created, ok: ok ? 'PASS' : 'FAIL', detail })));
  console.log('\n--- Tổng hợp ---');
  console.log(`Tổng case           : ${total}`);
  console.log(`- Gold đơn (PLACE)  : ${goldOrders}   | tạo đơn thành công: ${correctOrders}`);
  console.log(`- Gold tư vấn/khác  : ${total - goldOrders} | từ chối đúng: ${correctRefusals}`);
  console.log(`Precision đơn       : ${pct(createdOrders ? correctOrders / createdOrders : 0)}  (của ${createdOrders} đơn được tạo, ${correctOrders} đúng)`);
  console.log(`Recall đơn          : ${pct(correctOrders / (goldOrders || 1))}  (bắt được ${correctOrders}/${goldOrders} ý định mua đúng)`);
  console.log(`Độ chính xác quyết định đặt/tư vấn (overall) : ${pct(decisionAcc)}  (${correctOrders + correctRefusals}/${total})`);
  console.log(`False-positive (tạo đơn oan) : ${falsePositive}`);
  console.log(`False-negative (bỏ sót đơn)   : ${falseNegative}`);
  console.log(`Báo lỗi qty/vu lệch trong đơn : ${qtyWrong}`);

  const stored = {
    provider: dataset._meta.provider, catalog: dataset._meta.catalog, n: total,
    precision: round2(createdOrders ? correctOrders / createdOrders : 0),
    recall: round2(correctOrders / (goldOrders || 1)),
    overallAccuracy: round2(decisionAcc),
    falsePositive, falseNegative, qtyWrong,
    cases: rows.filter((r) => !r.ok).map((r) => ({ id: r.id, detail: r.detail })),
  };
  writeReport('rq1-result.json', stored);

  await app.close();
  await prisma.$disconnect();
}

function pct(x) { return (x * 100).toFixed(1) + '%'; }
function round2(x) { return Math.round(x * 100) / 100; }
function trunc(s, n) { return s.length > n ? s.slice(0, n - 1) + '…' : s; }
function writeReport(name, obj) {
  const dir = path.join(__dirname, '..', '..', '..', '..', 'docs', 'research');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), JSON.stringify(obj, null, 2));
}

main().catch(async (e) => { console.error('RQ1 ERROR:', e); await prisma.$disconnect(); process.exit(1); });
