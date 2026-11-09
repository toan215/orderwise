# Orderwise — Vai trò 5 kỹ sư phần mềm (SE roles)

> Tóm tắt ngắn để phát cho cả team. 5 kỹ sư, mỗi người chủ MỘT core = một câu hỏi
> nghiên cứu + một con số đo được, cùng xây MỘT hệ thống Orderwise (không phải 5 app rời).
> Ai cũng code trên cùng schema đa-cửa-hàng + dataset hội thoại tiếng Việt chung
> → đó là lý do nó là "một dự án".

---

## Vai trò từng người

| # | Kỹ sư (core) | Làm gì | Số đo (phần thuyết trình 20%) | Gắn RQ |
|---|---|---|---|---|
| 1 | **E — Nhân viên hệ thống + trải nghiệm khách (Lead)** | Schema đa cửa hàng, RBAC, contract chung, kiến trúc; web-chat cho khách + web admin; AI nhất quán qua kênh; đo chất lượng bàn giao | Parity-score kênh, AI-resolve rate | tích hợp 5 core |
| 2 | **A — Trích xuất đơn nhiều lượt** | Dataset hội thoại VN (khách đổi ý, thêm sp, "cái áo hồi nãy"); pipeline LLM trích xuất theo trạng thái giữ slot, so 3 cách | joint-goal accuracy, entity F1 | RQ1 |
| 3 | **B — Chính sách xác nhận / bàn giao** | Khung chi phí (tạo sai đơn = khó chịu; bàn giao sớm = tốn công); tối ưu ngưỡng chốt/hỏi/giao | human-intervention rate, task success, ROC/cost | RQ1+RQ3 |
| 4 | **C — Tư vấn đúng sản phẩm (retrieval)** | Câu hỏi nhiều ràng buộc ("áo trắng size L <300k") + ngữ cảnh lượt trước; embedding + lọc thuộc tính + context | recall@k, nDCG | RQ3 |
| 5 | **D — Giữ hàng chống bán vượt** | Cơ chế hold + TTL + worker giải phóng; stress-test nhiều kênh đồng thời; tối ưu thời gian giữ | oversell=0, p95 latency, đường cong TTL | RQ2 |

---

## Trách nhiệm CHUNG cả 5 người

1. **Đọc tài liệu TRƯỚC khi code** (paper + đối thủ Sapo/KiotViet). Không code trước rồi
   mới tìm data.
2. Mỗi người có **1 dataset + 1 metric riêng** — con số đó là phần thuyết trình 20%.
3. **AI chỉ tăng tốc boilerplate** (CRUD, component, script). Phần khó (dữ liệu, phép đo,
   phân tích, kết luận) do từng người làm — đó là "công sức nghiên cứu" để nói với hội đồng.
4. Chạy được **không cần API key** (Mock LLM); **deploy 1 VPS** để có link sống.

---

## Trả lời câu hỏi của hội đồng

- "Khác Sapo/KiotViet chỗ nào?"
  » "Sapo bán tính năng tự động; chúng tôi đo độ tin cậy của chính tính năng đó — họ không
  công bố con số, bài báo của tôi là con số."
- "AI viết code hết thì các bạn làm gì?"
  » "AI tăng tốc đoạn mã thường; vấn đề nghiên cứu, dữ liệu, phép đo và kết luận do tôi."
- "5 người làm gì khác nhau?"
  » Mỗi người sở hữu một câu hỏi + một con số; cùng code trên một schema/dataset → một hệ thống.

---

## Cách vận hành (khớp Conductor)

- Roadmap = Conductor tasks; mỗi người nhận 1 task chạy trên worktree riêng.
- Không tự tay "cày" task to inline — Lead (kỹ sư E) decompose, dispatch cho từng người,
  review kết quả thực (build/typecheck/thí nghiệm thật).
- Giao nộp: `pnpm typecheck` + `pnpm build` sạch + số liệu thật từ thí nghiệm.
