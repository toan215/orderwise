/* RQ3 — Chất lượng retrieval: RAG (pgvector cosine) vs keyword baseline (ILIKE).
 * Chạy trên research-shop (đã seed + embed bởi research-seed.js). Mỗi câu hỏi có
 * nguồn kỳ vọng (SKU cho sản phẩm / đoạn trong FAQ / tiêu đề policy). Đo hit@1
 * cho cả 2 nhánh rồi so sánh. Nhận định trung thực: với MockEmbeddingProvider
 * (hash/token-overlap, không semantic) RAG gần như = keyword; swap OpenAI embedding
 * mới thể hiện lợi thế semantic. Methodology + harness là phần có thể tái dùng.
 * Chạy: node scripts/research/rq3-eval.js
 */
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../../dist/app.module');
const { PrismaClient } = require('@orderwise/prisma');
const { RagService } = require('../../dist/ai/rag/rag.service');

const prisma = new PrismaClient();

const QUESTIONS = [
  { kind: 'product', q: 'áo thun màu xám giá bao nhiêu', expect: 'TEE-GREY-XL' },
  { kind: 'product', q: 'quần jean slim có size 32 không', expect: 'JEAN-SLIM-32' },
  { kind: 'product', q: 'áo khoác bomber đen giá nào', expect: 'JKT-BOMBER-L' },
  { kind: 'product', q: 'giày sneaker trắng size 42', expect: 'SHOE-SNKR-42' },
  { kind: 'product', q: 'balo laptop chống nước bán bao nhiêu', expect: 'BAG-LAPTOP' },
  { kind: 'product', q: 'áo sơ mi trắng nam giá', expect: 'SHIRT-WHITE-M' },
  { kind: 'product', q: 'chân váy xếp li đen', expect: 'SKIRT-PLEAT' },
  { kind: 'product', q: 'khăn choàng len giá', expect: 'SCARF-WOOL' },
  { kind: 'product', q: 'mũ lưỡi trai có màu đen không', expect: 'CAP-BLACK' },
  { kind: 'faq', q: 'đổi trả trong bao lâu', expect: 'Đổi trả' },
  { kind: 'faq', q: 'giao hàng mất mấy ngày', expect: 'Giao hàng mất' },
  { kind: 'faq', q: 'thanh toán COD được không', expect: 'COD' },
  { kind: 'faq', q: 'có hỗ trợ giao COD không', expect: 'COD' },
  { kind: 'faq', q: 'giày có bảo hành bao lâu', expect: 'bảo hành' },
  { kind: 'faq', q: 'tôi muốn lấy giá sỉ lẻ', expect: 'giá sỉ' },
  { kind: 'policy', q: 'chính sách đổi trả của shop', expect: 'Đổi trả hàng' },
  { kind: 'policy', q: 'phí vận chuyển tính sao', expect: 'Vận chuyển' },
  { kind: 'policy', q: 'chính sách bảo hành giày', expect: 'Bảo hành giày' },
  { kind: 'policy', q: 'shop có bán hàng chính hãng không', expect: 'Hàng chính hãng' },
  { kind: 'policy', q: 'thông tin của tôi có an toàn không', expect: 'Bảo mật' },
  { kind: 'policy', q: 'thanh toán khi nhận hàng được không', expect: 'Thanh toán' },
];

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const rag = app.get(RagService);
  const shop = await prisma.shop.findUnique({ where: { slug: 'research-shop' } });
  if (!shop) throw new Error('research-shop missing — run research-seed.js first');

  const rows = [];
  for (const it of QUESTIONS) {
    const ragRes = await rag.search(shop.id, it.q, { topK: 3 });
    // RAG top1 hit?
    let ragTop = null;
    if (it.kind === 'product') ragTop = ragRes.products[0] ? ragRes.products[0].sku : null;
    if (it.kind === 'faq') ragTop = ragRes.faqs[0] ? ragRes.faqs[0].question : null;
    if (it.kind === 'policy') ragTop = ragRes.policies[0] ? ragRes.policies[0].title : null;

    // keyword baseline (ILIKE token overlap) — independent implementation
    const kwTop = await keywordTop(shop.id, it);
    const ragOk = hit(ragTop, it);
    const kwOk = hit(kwTop, it);
    rows.push({
      kind: it.kind, q: trunc(it.q, 34), expect: trunc(it.expect, 20),
      ragTop: trunc(pick(ragTop), 22), ragOk, kwTop: trunc(pick(kwTop), 22), kwOk,
    });
  }

  const n = rows.length;
  const ragHits = rows.filter((r) => r.ragOk).length;
  const kwHits = rows.filter((r) => r.kwOk).length;
  const byKind = (k) => rows.filter((r) => r.kind === k);

  console.log('\n================= RQ3 — RAG vs KEYWORD (hit@1) =================');
  console.table(rows.map((r) => ({ kind: r.kind, q: r.q, expect: r.expect, rag: r.ragOk ? 'HIT' : 'miss', kw: r.kwOk ? 'HIT' : 'miss', 'rag→': r.ragTop, 'kw→': r.kwTop })));
  console.log(`Tổng câu hỏi                          : ${n}`);
  console.log(`RAG (pgvector)   hit@1                 : ${ragHits}/${n}  (${pct(ragHits / n)})`);
  console.log(`Keyword baseline hit@1                 : ${kwHits}/${n}  (${pct(kwHits / n)})`);
  for (const k of ['product', 'faq', 'policy']) {
    const g = byKind(k);
    const rh = g.filter((r) => r.ragOk).length, kh = g.filter((r) => r.kwOk).length;
    console.log(`  · ${k.padEnd(8)} n=${g.length}  RAG=${rh}/${g.length}  KW=${kh}/${g.length}`);
  }
  console.log('\nNhận định: embedder mock là hash/token-overlap (không semantic) nên RAG ~ keyword.');
  console.log('Đây là baseline có thể tái dùng: đổi EMBEDDING_API_KEY (OpenAI) rồi chạy lại để đo lợi thế semantic thật.');

  fsWrite('rq3-result.json', { n, ragHits, kwHits, ragAccuracy: round2(ragHits / n), kwAccuracy: round2(kwHits / n), perKind: { product: gsum(rows, 'product'), faq: gsum(rows, 'faq'), policy: gsum(rows, 'policy') }, misses: rows.filter((r) => !r.ragOk && !r.kwOk).map((r) => ({ kind: r.kind, q: r.q, expect: r.expect })) });
  await app.close();
  await prisma.$disconnect();
}

function gsum(rows, k) { const g = rows.filter((r) => r.kind === k); return { n: g.length, rag: g.filter((r) => r.ragOk).length, kw: g.filter((r) => r.kwOk).length }; }

async function keywordTop(shopId, it) {
  const tokens = it.q.toLowerCase().split(/\s+/).filter((t) => t.length > 1);
  if (it.kind === 'product') {
    const vs = await prisma.productVariant.findMany({ where: { product: { shopId } }, include: { product: true, inventory: true } });
    return best(vs.map((v) => ({ key: v.sku, text: `${v.name} ${v.sku} ${v.product.name}`.toLowerCase() })), tokens);
  }
  if (it.kind === 'faq') {
    const fs2 = await prisma.fAQEntry.findMany({ where: { shopId, active: true } });
    return best(fs2.map((f) => ({ key: f.question, text: `${f.question} ${f.answer}`.toLowerCase() })), tokens);
  }
  const ps = await prisma.policy.findMany({ where: { shopId, active: true } });
  return best(ps.map((p) => ({ key: p.title, text: `${p.title} ${p.content}`.toLowerCase() })), tokens);
}
function best(items, tokens) {
  let bestKey = null, bestScore = 0;
  for (const it of items) {
    const s = tokens.filter((t) => it.text.includes(t)).length;
    if (s > bestScore) { bestScore = s; bestKey = it.key; }
  }
  return bestKey;
}
function hit(top, it) {
  if (top == null) return false;
  if (it.kind === 'product') return top.toUpperCase() === it.expect.toUpperCase();
  return String(top).toLowerCase().includes(String(it.expect).toLowerCase());
}
function pick(s) { return s == null ? '(none)' : s; }
function trunc(s, n2) { s = String(s); return s.length > n2 ? s.slice(0, n2 - 1) + '…' : s; }
function pct(x) { return (x * 100).toFixed(1) + '%'; }
function round2(x) { return Math.round(x * 100) / 100; }
function fsWrite(name, obj) { const fs = require('fs'); const p = require('path').join(__dirname, '..', '..', '..', '..', 'docs', 'research'); fs.mkdirSync(p, { recursive: true }); fs.writeFileSync(require('path').join(p, name), JSON.stringify(obj, null, 2)); }

main().catch(async (e) => { console.error('RQ3 ERROR:', e); await prisma.$disconnect(); process.exit(1); });
