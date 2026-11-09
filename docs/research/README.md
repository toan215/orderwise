# Orderwise — Bộ số liệu nghiên cứu (RQ1 / RQ2 / RQ3)

Bằng chứng định lượng cho 3 câu hỏi nghiên cứu trong đề cương. Tất cả số liệu **được chạy thật** trên stack Docker (`docker compose up --build -d`) với mock data — không phải số chế. Script nằm ở `apps/api/scripts/research/`, report JSON tự ghi vào `docs/research/`.

## Chạy lại

```bash
# stack lên + seed demo (mock LLM/embedding mặc định — không cần API key)
docker compose up --build -d
pnpm --filter @orderwise/api build          # dist cho harness in-process

# môi trường mock khớp cột vector(1024) — bỏ qua .env có key embedding thật
export DATABASE_URL="postgresql://orderwise:orderwise@localhost:5434/orderwise?schema=public"
export LLM_API_KEY= EMBEDDING_API_KEY= EMBEDDING_DIM=1024
cd apps/api

node scripts/research/research-seed.js      # RQ3: tạo shop 'research-shop' + embed catalog/FAQ/policy
node scripts/research/rq1-eval.js           # RQ1: trích xuất đơn
node scripts/research/rq2-stress.js         # RQ2: chống bán vượt dưới tải  (HTTP → localhost:4010)
node scripts/research/rq3-eval.js           # RQ3: RAG vs keyword
```

> Muốn đo LLM / embedding thật (có API key): đặt `LLM_BASE_URL`/`EMBEDDING_BASE_URL` + key và **sửa `EMBEDDING_DIM` khớp cột** (migrate nếu đổi). Cùng dataset + harness, chạy lại là có con số LLM thật.

## Kết quả (mock provider, 2026-11-09)

| RQ | Chỉ số | Giá trị | Nhận định |
|----|--------|---------|-----------|
| **RQ1** | Precision đơn | **95.2%** | 21 đơn tạo → 20 đúng |
| | Recall đơn | **100%** | bắt 20/20 ý định mua |
| | Overall (đặt/tư vấn) | **96.7%** | 29/30 |
| | False-positive / qty sai | 1 / 0 | |
| **RQ2** | Tải song song / giỏ | 40 / 30 | |
| | Đơn giữ thành công | **30** | = đúng cỡ giỏ |
| | Bán vượt | **0** | onHold 30 ≤ onHand 30, sellable 0 |
| | Lỗi server | 0 | |
| | Tail latency (p95) | ~30s | advisory lock serializes |
| **RQ3** | RAG (mock) hit@1 | **81.0%** | product 6/9 |
| | Keyword baseline hit@1 | **95.2%** | product 9/9 |

## Đọc kết quả trung thực (quan trọng)

- **RQ1** dùng `MockLlmProvider` deterministic (rule) nên gần như lý tưởng; con số 95.2/100 phản ánh đúng mock. 1 false-positive (`u03`: *"cho tôi xem giá áo thun"* bị `looksLikeOrder` nhận nhầm thành đơn) là giới hạn thật của mock. Để đo độ chính xác *LLM thật*, chạy lại với `OpenAiProvider` — harness + dataset đã sẵn.
- **RQ2**: hệ thống **không bán vượt** dưới tải — đúng cam kết proposal (giữ hàng `SELECT ... FOR UPDATE` + advisory lock orderCode). Tail latency cao vì advisory xact lock **tuần tự hóa tạo đơn cùng shop** (đảm bảo mã đơn không trùng) — đánh đổi correctness/throughput, cần nêu trong luận.
- **RQ3**: với mock embedding (hash/token-overlap, **không semantic**), RAG pgvector **kém hơn** keyword thuần (81 vs 95%). Đây là bằng chứng cho thấy cần embedding ngữ nghĩa thật; harness swap–ready khi có `EMBEDDING_API_KEY`.

## Bug thật phát hiện và đã sửa nhờ RQ2
- **Race orderCode dưới tải song song**: sinh mã `OW-00001` (max+1) ngoài transaction → nhiều request cùng lấy số → `unique(orderCode)` 23505 → 5xx. Fix: tính mã **trong transaction sau advisory xact lock per-shop** (`pg_advisory_xact_lock(hashtextextended(shopId,0))`) — không đổi schema, các shop song song độc lập. Xem `apps/api/src/orders/orders.service.ts`.

## Files
- `research-seed.js` — seed + embed catalog nghiên cứu (10 product, 8 FAQ, 6 policy)
- `rq1-dataset.json` + `rq1-eval.js` — 30 case tiếng Việt có nhãn
- `rq2-stress.js` — stress HTTP song song + bất biến tồn kho
- `rq3-eval.js` — RAG(pgvector) vs keyword, hit@1 per-kind
