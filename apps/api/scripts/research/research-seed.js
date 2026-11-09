/* Research seed — tạo shop nghiên cứu 'research-shop' với catalog phong phú
 * (10 sản phẩm/variant) + 8 FAQ + 6 policy, rồi embed tất cả vào pgvector
 * (dùng embedder đang active — mặc định MockEmbeddingProvider hash; đổi provider
 * khi có key để đo semantic retrieval thực). Idempotent: xoá dữ liệu research-shop trước.
 * Chạy: node scripts/research/research-seed.js  (đã build, stack Docker lên)
 */
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../../dist/app.module');
const { PrismaClient } = require('@orderwise/prisma');
const { RagService } = require('../../dist/ai/rag/rag.service');
const { EMBEDDING_PROVIDER } = require('../../dist/ai/ai.tokens');

const prisma = new PrismaClient();

const PRODUCTS = [
  { name: 'Áo thun cotton Xám', variants: [[ 'TEE-GREY-XL', 'Xám / XL', 160000, 12 ]] },
  { name: 'Áo thun cotton Đen', variants: [[ 'TEE-BLACK-M', 'Đen / M', 150000, 20 ]] },
  { name: 'Quần jean slim', variants: [[ 'JEAN-SLIM-32', 'Xanh / 32', 320000, 8 ]] },
  { name: 'Áo khoác bomber', variants: [[ 'JKT-BOMBER-L', 'Đen / L', 650000, 5 ]] },
  { name: 'Giày sneaker trắng', variants: [[ 'SHOE-SNKR-42', 'Trắng / 42', 990000, 6 ]] },
  { name: 'Balo laptop chống nước', variants: [[ 'BAG-LAPTOP', 'Một size', 450000, 15 ]] },
  { name: 'Áo sơ mi trắng nam', variants: [[ 'SHIRT-WHITE-M', 'Trắng / M', 280000, 18 ]] },
  { name: 'Chân váy xếp li', variants: [[ 'SKIRT-PLEAT', 'Đen / S', 240000, 10 ]] },
  { name: 'Mũ lưỡi trai đen', variants: [[ 'CAP-BLACK', 'Đen / Free size', 120000, 30 ]] },
  { name: 'Khăn choàng len', variants: [[ 'SCARF-WOOL', 'Xám / 190cm', 180000, 14 ]] },
];

const FAQS = [
  { question: 'Áo thun có những size nào chính hãng?', answer: 'Shop có M, L, XL, XXL — tất cả chính hãng có tem.' },
  { question: 'Chính sách đổi trả hàng như thế nào?', answer: 'Đổi trả miễn phí trong 7 ngày kể từ khi nhận hàng.' },
  { question: 'Giao hàng mất bao lâu?', answer: 'Nội thành 1-2 ngày, toàn quốc 2-4 ngày làm việc.' },
  { question: 'Thanh toán bằng hình thức nào?', answer: 'COD hoặc chuyển khoản; miễn phí vận chuyển đơn trên 500.000đ.' },
  { question: 'Giày có bảo hành không?', answer: 'Giày bảo hành 6 tháng về lỗi keo, đế.' },
  { question: 'Có giá sỉ cho cửa hàng không?', answer: 'Có, liên hệ fanpage để nhận bảng giá sỉ theo số lượng.' },
  { question: 'Sản phẩm có giao COD toàn quốc không?', answer: 'Có, hỗ trợ COD toàn quốc.' },
  { question: 'Khiếu nại hàng lỗi phải làm sao?', answer: 'Gửi video mở hộp trong 48h để được hỗ trợ đổi ngay.' },
];

const POLICIES = [
  { title: 'Đổi trả hàng', content: 'Đổi trả miễn phí trong 7 ngày; hoàn tiền 100% nếu lỗi từ shop.' },
  { title: 'Vận chuyển', content: 'Giao nội thành 1-2 ngày, toàn quốc 2-4 ngày; miễn phí ship từ 500.000đ.' },
  { title: 'Thanh toán', content: 'Chấp nhận COD và chuyển khoản ngân hàng.' },
  { title: 'Bảo hành giày', content: 'Bảo hành 6 tháng về lỗi keo và lỗi đế.' },
  { title: 'Hàng chính hãng', content: '100% chính hãng, có tem và xuất hoá đơn VAT theo yêu cầu.' },
  { title: 'Bảo mật', content: 'Thông tin khách hàng không chia sẻ cho bên thứ ba.' },
];

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const rag = app.get(RagService);
  const embedder = app.get(EMBEDDING_PROVIDER);
  const model = embedder.name;

  let shop = await prisma.shop.findUnique({ where: { slug: 'research-shop' } });
  if (shop) {
    // reset corpus of this research shop (idempotent run)
    await prisma.product.deleteMany({ where: { shopId: shop.id } });
    await prisma.fAQEntry.deleteMany({ where: { shopId: shop.id } });
    await prisma.policy.deleteMany({ where: { shopId: shop.id } });
    await prisma.shopMember.deleteMany({ where: { shopId: shop.id } });
  } else {
    shop = await prisma.shop.create({ data: { name: 'Research Shop', slug: 'research-shop' } });
  }

  const variantIds = [];
  for (const p of PRODUCTS) {
    const prod = await prisma.product.create({ data: { shopId: shop.id, name: p.name, sku: p.variants[0][0] } });
    for (const [sku, vname, price, onHand] of p.variants) {
      const v = await prisma.productVariant.create({
        data: { productId: prod.id, sku, name: vname, price, optionValues: JSON.stringify([]) },
      });
      await prisma.inventoryItem.create({ data: { shopId: shop.id, variantId: v.id, onHand, onHold: 0, stockedOut: 0 } });
      variantIds.push(v.id);
    }
  }
  const faqIds = [];
  for (const f of FAQS) {
    const faq = await prisma.fAQEntry.create({ data: { shopId: shop.id, question: f.question, answer: f.answer, active: true } });
    faqIds.push(faq);
  }
  const policyIds = [];
  for (const p of POLICIES) {
    const pol = await prisma.policy.create({ data: { shopId: shop.id, title: p.title, content: p.content, active: true } });
    policyIds.push(pol);
  }

  // --- Embed ---
  await prisma.variantEmbedding.deleteMany({ where: { model } });
  await prisma.fAQEmbedding.deleteMany({ where: { model } });
  await prisma.policyEmbedding.deleteMany({ where: { model } });

  for (const vid of variantIds) await rag.indexVariant(vid);
  for (const f of faqIds) {
    const content = `${f.question} · ${f.answer}`;
    const [vec] = await embedder.embed([content]);
    await addEmbedding('FAQEmbedding', 'faqId', f.id, content, vec, model);
  }
  for (const p of policyIds) {
    const content = `${p.title} · ${p.content}`;
    const [vec] = await embedder.embed([content]);
    await addEmbedding('PolicyEmbedding', 'policyId', p.id, content, vec, model);
  }

  const counts = {
    products: await prisma.product.count({ where: { shopId: shop.id } }),
    variants: await prisma.productVariant.count({ where: { product: { shopId: shop.id } } }),
    faqs: await prisma.fAQEntry.count({ where: { shopId: shop.id } }),
    policies: await prisma.policy.count({ where: { shopId: shop.id } }),
  };
  console.log(`\nResearch shop ready: slug=research-shop model=${model}`);
  console.log(counts);
  await app.close();
  await prisma.$disconnect();

  async function addEmbedding(table, fkCol, fkVal, content, vec, model) {
    const dim = vec.length;
    const vecLit = `[${vec.map((v) => v.toFixed(6)).join(',')}]`;
    const hash = String(sum(content));
    const id = cuid();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "${table}" ("id","${fkCol}","model","contentHash","vector","content","updatedAt")
       VALUES ('${id}','${fkVal}','${esc(model)}','${hash}','${vecLit}'::vector(1024),'${esc(content)}', now())
       ON CONFLICT ("${fkCol}","model") DO UPDATE SET
        "contentHash"=EXCLUDED."contentHash","vector"=EXCLUDED."vector","content"=EXCLUDED."content","updatedAt"=now()`,
    );
  }
}

function sum(s) { let h = 0; for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0; return (h >>> 0); }
function esc(s) { return String(s).replace(/'/g, "''"); }
function cuid() { return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`; }

main().catch(async (e) => { console.error('SEED ERROR:', e); await prisma.$disconnect(); process.exit(1); });
