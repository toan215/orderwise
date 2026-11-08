# Orderwise

**An AI-Powered Sales Assistant for Small Shops** — tập trung hội thoại từ Facebook Messenger / Zalo OA / web-chat, tư vấn khách hàng bằng AI có căn cứ trên dữ liệu cửa hàng, tạo đơn từ hội thoại và quản lý tồn kho đa kênh với cơ chế giữ hàng chống bán vượt.

## Tech stack

- **Workspace**: pnpm workspaces (monorepo)
- **Backend**: Node.js + NestJS 10, TypeScript, RESTful
- **Frontend**: Next.js 14 (App Router) + Tailwind + shadcn/ui (apps/web)
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
    │   └── src/ai/             # AI engine: RAG (pgvector), LLM provider, intent pipeline, BullMQ workers
    └── web/                    # Next.js 14 admin: auth, dashboard, conversations, orders, inventory, products
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

# 4. Chạy web admin (Next.js) — dev proxy tự chuyển /api/* đến port 4010
cp apps/web/.env.example apps/web/.env
pnpm dev:web        # http://localhost:3000
pnpm dev            # chạy đồng thời api + web
```

### Credentials seed dev
`owner@orderwise.dev` / `Orderwise123!` (shop `demo-shop`, 1 sản phẩm, tồn 20).

## Healthcheck & smoke
- `GET /api/health` → `{"status":"ok","db":"up"}`
- Order lifecycle: create → request-confirm (đặt hold) → customer-confirm (convert hold→stockedOut) → seller-confirm → cancel (trả stock). Đã verify E2E bằng script tự động.
- AI pipeline: `POST /api/shops/:shopId/conversations/:convId/ai-message` → `node apps/api/scripts/ai-e2e.js` (boot app thật, chạy intent pipeline với mock LLM, tạo order + giữ hàng, PASS nếu đủ điều kiện).

## AI engine (apps/api/src/ai)
- **Provider abstraction**: không cần API key để chạy — `LLM_API_KEY` rỗng → `MockLlmProvider` (deterministic, parse tin nhắn seed), đặt key + `LLM_BASE_URL` → `OpenAiProvider` (OpenAI-compatible).
- **RAG** (`RagService`): embedding variant/policy/FAQ vào pgvector, search cosine qua raw SQL + fallback ILIKE. `EMBEDDING_DIM` phải khớp cột `vector(1024)`.
- **Intent pipeline** (`AiService` + `IntentResolver`): inbox → LLM extract `OrderExtraction` → resolve rawLines→variants (RAG + SKU) → kiểm tra stock → tạo DRAFT order + `requestCustomerConfirm` (giữ hàng, TTL 15') → trả lời khách + Socket.IO. Ngoài đơn → trả lời bằng RAG (catalog/FAQ/policy) hoặc hỏi thông tin còn thiếu.
- **BullMQ workers**: `HOLD_TIMEOUT` (expire đơn quá TTL + giải phóng hold) + `HOLD_TIMEOUT_SCAN` (sweep 60s chống sót), `DELIVERY_RETRY`, `EMBEDDING`. Dùng raw `bullmq` (không cần `@nestjs/bullmq`). Tên queue không chứa `:`.
- **Tool-calling**: schemas trong `tools/ai.tools.ts` (search_catalog, create_order_draft, request_customer_confirm, lookup_policy, hand_to_seller).

## Notes dev
- **Nguyên tắc giữ hàng**: `hold()` dùng `SELECT ... FOR UPDATE` trong cùng transaction của caller (không nested interactive transaction), `StockHolding.inventoryId` trỏ vào `InventoryItem.id`, `stockMovement.shopId` lấy từ dòng inventory (không bao giờ `''`).
- **Trả dữ liệu sau commit**: service trả `detail()` SAU khi transaction commit, tránh body 201 rỗng.
- **Port**: API mặc định 4010 (4000 đang bị cortex-api chiếm).
- **pgvector**: extension tên `vector` (không phải `pgvector`) trong image `pgvector/pgvector`.

## Routing Conductor (Cortex Hub)
Roadmap được track bằng task Conductor. Trạng thái hiện tại:
- ✅ **AI engine**: RAG + tool-calling + intent pipeline + workers (`task_cc6f62d4`)
- ✅ **Frontend admin (part 1)**: Next.js admin — auth, dashboard, conversations, orders, inventory, products (`task_527c3e`, xây xong core)
- ⬜ Frontend web-chat widget (đính kèm admin)
- ⬜ Channel integrations: Messenger + Zalo OA + realtime
- ⬜ CI/CD, Docker deploy, Cloudinary, docs

## Web admin (apps/web)
- **Auth**: JWT trong localStorage, auto-refresh single-flight khi 401, shop-switcher đa-cửa-hàng từ `GET /auth/me` (user + shops + role + capabilities).
- **RBAC nav**: các trang ẩn theo `hasCapability` từ `/auth/me`.
- **Trang**: Dashboard (stats + recent orders + low-stock), Conversations (list + thread + send/take-over/pause-AI), Orders (list + detail + confirm/cancel theo state machine), Inventory, Products.
- **i18n**: vi/en runtime (nút chuyển ngôn ngữ ở sidebar), format VND qua `Intl`.
- **Dev proxy**: `next.config.mjs` rewrite `/api/*` → `API_URL` (mặc định `http://localhost:4010`), tránh CORS trong dev.
- **API surface cần thêm cho frontend**: `GET /auth/me` trả `{ user, shops: [{id,name,slug,role,capabilities}] }`.
