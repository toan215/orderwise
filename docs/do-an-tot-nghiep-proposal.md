# ĐỒ ÁN TỐT NGHIỆP — PROPOSAL

## Orderwise: Trợ lý bán hàng AI đa kênh cho cửa hàng nhỏ

> Hệ thống AI bán hàng cho cửa hàng nhỏ: hội thoại từ web-chat (mở rộng: Facebook Messenger / Zalo OA), tư vấn khách bằng LLM có căn cứ trên dữ liệu cửa hàng (RAG), tự trích xuất và tạo đơn từ hội thoại, quản lý tồn kho đa kênh với cơ chế giữ hàng chống bán vượt.

---

## 1. Bối cảnh & bài toán

- Cửa hàng nhỏ (nhà bán lẻ online, bán qua mạng xã hội / website) thường bán hàng qua chat (Messenger, Zalo, chat widget) bằng **nhân công thủ công**: trả lời giá, kiểm tra stock, chốt đơn — chậm và sai sót khi nhiều người cùng chat.
- Khi bán song song nhiều kênh, **bán vượt tồn kho** (oversell) xảy ra vì không có cơ chế chốt hàng nào đồng bộ giữa các kênh.
- **Bài toán:** xây một trợ lý AI vận hành được trên nhiều kênh chat, có khả năng (1) trả lời có căn cứ trên dữ liệu thật của cửa hàng, (2) tự tạo đơn từ hội thoại kèm vòng **xác nhận của khách** để không tạo bậy, (3) giữ hàng để **đảm bảo không bán vượt** khi nhiều kênh cùng chốt.

## 2. Câu hỏi nghiên cứu (đóng góp chính)

- **RQ1 — Độ tin cậy trích xuất đơn:** LLM tool-calling có thể trích xuất `OrderExtraction` (sản phẩm, số lượng, tùy chọn, thông tin được) từ hội thoại tiếng Việt tự do đạt độ chính xác bao nhiêu? Đánh giá trên tập dữ liệu seed + đề xuất vòng xác nhận khách để loại sai sót trước khi tạo đơn.
- **RQ2 — Tính nhất quán tồn kho đa kênh:** giao thức giữ hàng `hold` (khóa hàng `SELECT ... FOR UPDATE` + TTL hết hạn + worker giải phóng) đảm bảo **không bán vượt** trong điều kiện nhiều kênh đồng thời — kiểm chứng bằng stress test dưới tải.
- **RQ3 — Chất lượng RAG:** truy vấn catalog/FAQ/policy bằng pgvector (cosine + fallback ILIKE) có trả lời đúng nội dung cửa hàng không so với keyword đơn thuần?

## 3. Mục tiêu & phạm vi

**Trong phạm vi (cốt lõi — phục vụ RQ):**
- Backend API đa cửa hàng (multi-tenant) + RBAC (OWNER/MANAGER/SELLER/VIEWER).
- AI engine: provider abstraction (Mock khi không có API key / OpenAI-compatible khi có key), **RAG trên pgvector**, **intent pipeline tool-calling**, pipeline trích xuất đơn.
- Vòng đời đơn có giữ hàng: tạo nháp → yêu cầu xác nhận (đặt hold) → khách xác nhận (hold → stockedOut) → người bán xác nhận → hủy (trả hàng). Kèm worker TTL giải phóng hold hết hạn.
- 1 kênh demo thật: **web-chat widget** (khách ẩn danh chat AI, tạo đơn + xác nhận từ widget).
- Web admin (Next.js): auth, dashboard, hội thoại, đơn, tồn kho, sản phẩm, chuyển ngôn ngữ vi/en.

**Ngoài phạm vi (future work — tuyên bố rõ trong đề cương):**
- Tích hợp **Facebook Messenger + Zalo OA**: thiết kế channel abstraction (`IChannelProvider`) cho phép thêm kênh, nhưng không triển khai production webhook do phụ thuộc App Review / business verify của bên ngoài. Đây là chủ ý để giữ đề tài khít thời hạn.
- Deploy scale-out, Cloudinary lưu media, CI/CD hoàn chỉnh.

## 4. Kiến trúc đề xuất

```
              web-chat widget            (kênh demo — khách ẩn danh, token localStorage)
                    │  /public/web-chat/*
                    ▼
                Gateway kênh ◄────── ChannelProvider abstraction (Messenger/Zalo = future)
                    │  Socket.IO (realtime)
        ┌───────────┴───────────┐
        ▼                       ▼
   AI engine               Order/Inventory
  ├ RAG (pgvector)         ├ create order (DRAFT)
  ├ intent pipeline        ├ requestCustomerConfirm → hold
  ├ tool-calling LLM       └ confirm/cancel → stock (FOR UPDATE)
        │                          │
        └────── BullMQ: EMBEDDING · HOLD_TIMEOUT · HOLD_TIMEOUT_SCAN ──┘
                                   (Redis)
        Foundation: PostgreSQL + pgvector, Prisma, NestJS 10 (apps/api),
                    Next.js 14 (apps/web), pnpm monorepo
```

## 5. Công nghệ

- Monorepo pnpm · NestJS 10 + TypeScript (RESTful) · Next.js 14 App Router + Tailwind + shadcn/ui.
- PostgreSQL + **pgvector** + Prisma ORM · Redis (BullMQ) · Socket.IO.
- LLM: Mock provider (không cần key, chạy demo) / OpenAI-compatible (khi có key) — tool-calling + embeddings.
- Storage: local (Cloudinary để future).

## 6. Kế hoạch thực hiện (13 tuần, mốc giao)

| Tuần | Công việc | Đầu ra |
|------|-----------|--------|
| 1–2 | Lập đề cương, chuẩn hóa domain, schema Prisma, RBAC, migrate+seed | Mô hình dữ liệu + seed chạy được |
| 3–4 | Nền API đa cửa hàng: auth JWT, shop-scoping, catalog, đơn, tồn kho | CRUD + auth hoàn chỉnh |
| 5–6 | Quan hệ giữ hàng: `hold` FOR UPDATE, vòng đời đơn, worker TTL + sweep | Lifecycle đơn đúng + khỏi oversell |
| 7–9 | AI engine: provider, RAG pgvector, intent pipeline tool-calling, **đánh giá RQ1/RQ3** | Pipeline chạy end-to-end + số liệu |
| 10 | Web admin: dashboard, hội thoại, đơn, tồn kho, sản phẩm | Frontend sử dụng được |
| 11 | Web-chat widget + public API kênh | Khách chat → AI → tạo đơn + xác nhận |
| 12 | **Stress-test RQ2** (tải đồng thời, kiểm chứng không oversell), hoàn thiện báo cáo, số liệu | Kết luận nghiên cứu |
| 13 | Luận, bảo vệ, demo | Nộp đồ án |

## 7. Khó khăn & giải pháp

| Rủi ro | Mức | Giảm thiểu |
|--------|-----|-----------|
| LLM trích xuất sai/thiếu | **Cao** | Vòng xác nhận khách bắt buộc + fallback hỏi lại + handoff người bán; không auto-chốt đơn |
| Khóa hàng oversell dưới tải | **Cao** | `SELECT ... FOR UPDATE` trong cùng transaction của caller; worker TTL; stress test là bằng chứng |
| Tích hợp Messenger/Zalo chậm do App Review | **Cao** | Cắt khỏi scope, chỉ giữ channel abstraction; demo bằng web-chat |
| Kết quả RAG kém với tiếng Việt | Trung bình | Seed dữ liệu thực (FAQ/policy/variant), fallback ILIKE, đánh giá so sánh |

## 8. Đóng góp / điểm đánh giá

1. **Pipeline AI vận hành được** (không phải demo hello-world): RAG + tool-calling + trích xuất đơn + xác nhận, chạy được **không cần API key** (Mock provider) — dễ demo trước hội đồng.
2. **Bằng chứng định lượng** cho RQ1 (độ chính xác trích xuất), RQ2 (không oversell dưới tải), RQ3 (RAG vs keyword).
3. **Kiến trúc sạch**: multi-tenant + RBAC + channel abstraction + provider abstraction → thể hiện năng lực thiết kế hệ thống, không chỉ viết feature.

## 9. Meterial / benchmark tối thiểu (đề nghị)

- 1 dataset hội thoại tiếng Việt mẫu (30–50 hội thoại) để đánh giá **độ chính xác trích xuất đơn** (RQ1).
- 1 stress script gửi N yêu cầu chốt đơn song song trên nhiều "kênh mô phỏng" để kiểm chứng **không oversell** và thời gian phản hồi (RQ2).
- 1 bộ câu hỏi RAG (giá/SKU/policy) để so sánh retrieval (RQ3).
