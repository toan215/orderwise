/* RQ2 — Stress: chống bán vượt dưới tải song song nhiều kênh.
 * Chạy dựa trên API thật đang chạy (Docker) + reset stock qua Prisma.
 * Reset TEE-COTTON-WHITE-L onHand=30, rồi bắn 40 yêu cầu 'mua 1 áo thun cotton'
 * song song (mỗi token = 1 khách/kênh khác nhau). Mỗi đơn giữ 1.
 * Kỳ vọng: tối đa 30 đơn được tạo (giữ hàng), 10 phải bị chặn; bất biến tồn kho
 * onHold <= onHand (sellable >= 0) phải được giữ — KHÔNG được bán vượt.
 * Chạy: node scripts/research/rq2-stress.js   (đòi stack Docker đã up)
 * Biến env: ORDERWISE_API_URL (mặc định http://localhost:4010), DATABASE_URL host postgres.
 */
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://orderwise:orderwise@localhost:5434/orderwise?schema=public';
const { PrismaClient } = require('@orderwise/prisma');

const API = process.env.ORDERWISE_API_URL || 'http://localhost:4010';
const SKU = 'TEE-COTTON-WHITE-L';
const STOCK = 30;   // giỏ hàng thật
const LOAD = 40;    // yêu cầu đồng thời (> stock để ép cạnh tranh)

const prisma = new PrismaClient();

async function main() {
  const shop = await prisma.shop.findUnique({ where: { slug: 'demo-shop' } });
  const variant = await prisma.productVariant.findFirst({ where: { sku: SKU } });
  if (!shop || !variant) throw new Error('demo-shop seed missing');

  await prisma.inventoryItem.upsert({
    where: { variantId: variant.id },
    update: { onHand: STOCK, onHold: 0, stockedOut: 0 },
    create: { shopId: shop.id, variantId: variant.id, onHand: STOCK },
  });
  const base = await prisma.inventoryItem.findUnique({ where: { variantId: variant.id } });
  console.log(`Baseline: SKU=${SKU} onHand=${base.onHand} onHold=${base.onHold} sellable=${base.onHand - base.onHold - base.stockedOut}`);

  const started = Date.now();
  const jobs = Array.from({ length: LOAD }, (_, i) => send(`chan-${i}-${Date.now()}`, 'mua 1 áo thun cotton'));
  const results = await Promise.all(jobs);
  const wall = Date.now() - started;

  const ordered = results.filter((r) => r.code === 201 && r.orderId);
  const blocked = results.filter((r) => r.code === 200 || (r.code === 400));
  const errored = results.filter((r) => r.code >= 500);
  const orderedIdx = results.map((r, i) => (r.code === 201 && r.orderId ? i : -1)).filter((i) => i >= 0);

  const inv = await prisma.inventoryItem.findUnique({ where: { variantId: variant.id } });
  const onHold = inv.onHold;
  const sellable = inv.onHand - inv.onHold - inv.stockedOut;
  const latencies = results.map((r) => r.ms).filter((x) => x !== undefined);

  const noOversell = onHold <= STOCK && sellable >= 0;
  const capacityOk = ordered.length <= STOCK;
  // Đơn được tạo phải <= tồn khả bán của mỗi đơn (mỗi đơn 1) — và tổng onHold không vượt giỏ.
  const pass = noOversell && capacityOk;

  console.log('\n================= RQ2 — STRESS CHỐNG BÁN VƯỢT =================');
  console.log(`Giỏ hàng (stock)        : ${STOCK}`);
  console.log(`Tải song song (LOAD)    : ${LOAD}`);
  console.log(`→ Đơn được tạo (201)    : ${ordered.length}`);
  console.log(`→ Bị chặn (shortage/khác): ${blocked.length}`);
  console.log(`→ Lỗi server (5xx)      : ${errored.length}`);
  console.log(`Trạng thái cuối         : onHand=${inv.onHand} onHold=${onHold} stockedOut=${inv.stockedOut} sellable=${sellable}`);
  console.log(`Bất biến chống oversell : onHold(${onHold}) <= onHand(${STOCK}) && sellable(${sellable})>=0 ? ${noOversell}`);
  console.log(`Số đơn không vượt giỏ   : ${capacityOk}`);
  console.log(`Resp time               : avg=${avg(latencies)}ms p95=${pctile(latencies, 95)}ms max=${max(latencies)}ms (wall ${wall}ms)`);
  console.log(pass ? '\n✅ RQ2 PASS — KHÔNG bán vượt dưới tải' : '\n❌ RQ2 FAIL — phát hiện bán vượt / vi phạm bất biến');

  fsWrite('rq2-result.json', {
    stock: STOCK, load: LOAD, ordered: ordered.length, blocked: blocked.length, errored: errored.length,
    final: { onHand: inv.onHand, onHold, stockedOut: inv.stockedOut, sellable },
    noOversell, pass, latencies: { avg: Math.round(avg(latencies)), p95: pctile(latencies, 95), max: max(latencies) },
  });
  await prisma.$disconnect();
  if (!pass) process.exitCode = 1;
}

async function send(token, content) {
  const t0 = Date.now();
  try {
    const res = await fetch(`${API}/api/public/web-chat/demo-shop/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, content }),
    });
    const body = await res.json().catch(() => ({}));
    return { code: res.status, orderId: body.orderId, text: (body.text || '').slice(0, 40), ms: Date.now() - t0 };
  } catch (e) {
    return { code: 0, orderId: undefined, error: String(e.message || e), ms: Date.now() - t0 };
  }
}

function avg(a) { return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0; }
function max(a) { return a.length ? Math.max(...a) : 0; }
function pctile(a, p) {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
}
function fsWrite(name, obj) {
  const fs = require('fs');
  const dir = require('path').join(__dirname, '..', '..', '..', '..', 'docs', 'research');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(require('path').join(dir, name), JSON.stringify(obj, null, 2));
}

main().catch(async (e) => { console.error('RQ2 ERROR:', e); await prisma.$disconnect(); process.exit(1); });
