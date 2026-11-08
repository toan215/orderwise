# Orderwise

**An AI-Powered Sales Assistant for Small Shops** — tập trung hội thoại từ Facebook Messenger / Zalo OA / web-chat, tư vấn khách hàng bằng AI có căn cứ trên dữ liệu cửa hàng, tạo đơn từ hội thoại và quản lý tồn kho đa kênh với cơ chế giữ hàng chống bán vượt.

## Tech stack

- **Workspace**: pnpm workspaces (monorepo)
- **Backend**: Node.js + NestJS 10, TypeScript, RESTful
- **Frontend**: Next.js + Tailwind + shadcn/ui (apps/web — đang xây)
- **DB**: PostgreSQL + pgvector, Prisma ORM
- **Caching & queues**: Redis (BullMQ) — worker giải phóng hold hết hạn
- **Channels**: Meta Messenger API, Zalo OA OpenAPI, web-chat, Socket.IO
- **AI**: LLM tool-calling + RAG (embeddings trong pgvector)
- **Storage**: Cloudinary

## Cấu trúc

```
orderwise/
├── docker-compose.yml          # pgvector-postgres + redis (dev infra)
├── packages/
│   ├── prisma/                 # schema.prisma đầy đủ domain + migrations + seed
│   └── shared/                 # RBAC (capabilities per role), dùng chung
└── apps/
    ├── api/                    # NestJS API
    └── web/                    # Next.js frontend (chưa)
```

## Domain (Prisma)

Shops + RBAC (OWNER/MANAGER/SELLER/VIEWER) · Catalog (product/variants/options/media) · Policies & FAQs · Channels (Messenger/Zalo/Web) · Customers · Conversations + Messages · AI Intents (raw/resolved lines, steps, handoff) · Orders (status/payment/delivery/cancel + history) · **Inventory** (onHand/onHold/stockedOut + StockHolding + StockMovement) · Embeddings (pgvector) · Notifications · AuditLog.

## Chạy local

```bash
# 1. Khởi tạo infra (Postgres+pgvector, Redis)
pnpm infra:up

# 2. Migrate + seed
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# 3. Chạy API
cp apps/api/.env.example apps/api/.env
pnpm dev:api        # http://localhost:4010/api
```

### Credentials seed dev
`owner@orderwise.dev` / `Orderwise123!` (shop `demo-shop`, 1 sản phẩm, tồn 20).

## Healthcheck & smoke
- `GET /api/health` → `{"status":"ok","db":"up"}`
- Order lifecycle: create → request-confirm (đặt hold) → customer-confirm (convert hold→stockedOut) → seller-confirm → cancel (trả stock). Đã verify E2E bằng script tự động.

## Notes dev
- **Nguyên tắc giữ hàng**: `hold()` dùng `SELECT ... FOR UPDATE` trong cùng transaction của caller (không nested interactive transaction), `StockHolding.inventoryId` trỏ vào `InventoryItem.id`, `stockMovement.shopId` lấy từ dòng inventory (không bao giờ `''`).
- **Trả dữ liệu sau commit**: service trả `detail()` SAU khi transaction commit, tránh body 201 rỗng.
- **Port**: API mặc định 4010 (4000 đang bị cortex-api chiếm).
- **pgvector**: extension tên `vector` (không phải `pgvector`) trong image `pgvector/pgvector`.

## Routing Conductor (Cortex Hub)
Roadmap còn lại được track bằng task Conductor:
- Frontend Next.js admin + web-chat widget
- AI engine: RAG + tool-calling + intent pipeline + workers
- Channel integrations: Messenger + Zalo OA + realtime
- CI/CD, Docker deploy, Cloudinary, docs
