# Orderwise — 5 Core Logic cho 5 thành viên (phân chia đóng góp công bằng)

> Mục tiêu: một project, **chia về mặt trách nhiệm thành 5 core logic**, mỗi core
> đủ khó để 1 thành viên nhận là "đóng góp chính" và thuyết trình được phần của mình.
> Tổng 5 phần = 100%, không ai làm hộ ai, không phần nào là "hello-world".

---

## 0. Góc nhìn thị trường (founder lens) — khoảng trống THẬT cần lấp

> Đọc phần này TRƯỚC khi chốt RQ/cấu trúc cho 5 core. Nó trả lời "project này có bị trùng
> với sản phẩm đã bán không / xây cho ai". Mọi tuyên bố đều có nguồn công khai, không bịa.

### 0.1 Thị trường đã bão hòa ở "AI tự động tạo đơn + đồng bộ tồn kho"

| Nền tảng | Làm gì (đã bán) | Nguồn |
|---|---|---|
| **Sapo Chat OmniAI** | Gom FB/Zalo/Shopee/TikTok; AI tư vấn 24/7; tạo đơn trong chat; bàn giao nhân viên | sapo.vn |
| **KiotViet** | Chat đa kênh + Zalo OA; POS; báo cáo tồn/doanh thu; hàng theo size/màu/IMEI | kiotviet.vn |
| **MISA eShop** | Tự thu câu bình luận Messenger/livestream → tạo đơn; đồng bộ tồn realtime | misaeshop.vn |
| **Dê Cười (MONA)** | Chatbot chốt đơn; tra tồn realtime từng chi nhánh; chăm sóc sau bán | mona.media |
| **Bot Bán Hàng** | Quản lý hội thoại đa kênh + chatbot + xử lý đơn | sapo.vn |

→ "Xây trợ lý AI bán hàng, tạo đơn từ chat, chống oversell" **đã là hàng bán**. Nếu project
định vị như vậy sẽ bị hỏi "khác Sapo chỗ nào?". Đừng lấy đó làm đóng góp.

### 0.2 Khoảng trống: họ HỨA tự động nhưng KHÔNG đo lường

Từ chính marketing/nội dung đối thủ và bài viết vận hành, 3 lỗ hổng:

1. **AI tạo đơn tự động nhưng không ai công bố độ chính xác.** Họ bán "chốt đơn tự động"
   (mona.media, sapo.vn) nhưng không có con số về tỉ lệ tạo đơn sai / false order.
   → Đóng góp đáng tin ("trust-first") là trống; chỉ đo lường mới lấp được.
2. **Đồng bộ tồn loại oversell chỉ cho đơn ĐÃ chốt trên sàn TMĐT**; không ai tối ưu **hold-TTL
   khi khách đang phân vân trong chat** (khách bỏ → mất đơn; giữ dài → nghẽn hàng).
   → Nguồn: sheet.com.vn, sapo.vn. Đường cong TTL/Pareto là trống.
3. **Gom tin nhắn + AI tư vấn là mảng cạnh tranh khốc liệt** → project chỉ cần 1 kênh demo
   (web-chat) làm bằng chứng "channel-portable", và **đo chất lượng bàn giao có bias analysis**
   (thứ họ gắn nhãn "AI" mà không đo thật). → Nguồn: sapo.vn.

### 0.3 Bản đồ định vị lại

- Trục X: tự động hóa (thấp = sổ tay → cao = AI chốt đơn, gom đa kênh).
- Trục Y: đo lường / độ tin cậy khai báo (thấp = hứa tính năng → cao = metric công khai).

Sapo/KiotViet/MISA/Dê Cười đứng **X cao, Y thấp-trung bình** (bán tính năng, không công bố
số đo). **Orderwise đứng X cao, Y cao**: vẫn tự động để demo, nhưng mỗi đóng góp là **một
con số đo được** — đây là chỗ trống.

### 0.4 Quy chiếu 5 core vào gap

| Core | Câu hỏi được thị trường xác nhận | Vị trí lấp |
|---|---|---|
| A | "AI tạo đơn SAI bao nhiêu % khi khách đổi ý/tham chiếu lượt trước?" | Công bố độ chính xác trích xuất từ hội thoại nhiều lượt tiếng Việt |
| B | "Khi nào AI nên chốt / hỏi / bàn giao thay vì chốt bừa?" | Khung chi phí + ngưỡng tối ưu — đối thủ chỉ có heuristic "thiếu thì hỏi" |
| C | "Tư vấn đúng khi khách vừa nói màu + size + giá + ngữ cảnh lượt trước?" | recall@k / nDCG cho truy vấn ràng buộc — chưa bên nào in số này |
| D | "Giữ hàng lâu hay mau? Khách bỏ mất đơn, giữ dài nghẽn kho" | Đường cong TTL + Pareto oversell=0 — đối thủ chỉ ghi "có TTL" |
| E | "Cùng một AI, qua các kênh, hành xử nhất quán? Bàn giao người tốt?" | Khung đo parity + resolve-rate có bias — đối thủ gắn nhãn AI không đo |

### 0.5 Hệ quả cho cả team

- Trả lời "giống Sapo không?" bằng: *"Sapo bán tính năng tự động; chúng tôi đo độ tin cậy
  của chính tính năng đó — họ không công bố con số, bài báo của tôi là con số."*
- 3 dataset RQ1/RQ2/RQ3 giữ làm "phần bọc ngoài"; **lit review mỗi core phải đối chiếu cả
  paper LẪN đối thủ thương mại**, không chỉ nhau trong giới khoa học.
- Mỗi trang "literature" kèm một dòng: "đối thủ Sapo/KiotViet làm X nhưng không đo Y."

---

## 1. Có ổn khi một project có 5 "core" không?

**Được, nếu hiểu đúng** — nhưng có cạm bẫy khiến nó thành điểm trừ:

- **Đừng trình bày như 5 project con** (mỗi người một app riêng) — hội đồng sẽ cười vì
  không phải một hệ thống. Cách đúng: **một hệ thống tích hợp duy nhất**, chia thành
  5 trụ trách nhiệm (vertical), mỗi thành viên là owner một trụ.
- **Phần "core" không được chỉ là lệnh AI chép ra.** CRUD, form, layout là boilerplate
  → AI làm hết → không đáng ghi công. Điều một thành viên *sở hữu* là **phần khó + đo
  lường được**: tính đúng (correctness), bằng chứng, phương pháp đánh giá, thiết kế
  contract — thứ AI không tự "type ra" mà phải con người suy nghĩ.
- **Nguyên tắc công bằng**: mỗi core phải có (a) một "vấn đề khó" riêng, (b) một bằng
  chứng định lượng để thuyết trình, (c) khối lượng tương đương. Nếu một phần quá to,
  chia tiếp; nếu quá nhỏ, gộp.

Hệ quả thực tế: **ai làm nền trước sẽ viết phần nhàm nhất** (schema, auth, CRUD).
Để cân, gán nền (nền là ít phần thuyết trình nhất) cho người có phần khó dày nhất, hoặc
tách "nền" thành chung và chỉ người nào rảnh mới làm — không phải "core" của ai.

---

## 2. Đề xuất 5 Core (bản đồ hiện tại → 5 trụ)

| # | Core | "Vấn đề khó" cốt lõi | Bằng chứng thuyết trình | Gợi ý gán |
|---|------|----------------------|------------------------|-----------|
| 1 | **Nền tảng đa cửa hàng + RBAC** | Schema trung tâm, multi-tenant shop-scoping, phân quyền, contract API giữa các module | Diagram kiến trúc + chứng minh không cross-tenant data leak | (lead giữ / người nền) |
| 2 | **Quản lý đơn + giữ hàng (anti-oversell)** | Giao thức `hold` FOR UPDATE + TTL, ém hàng khi nhiều kênh đồng thời | **RQ2 stress test**: không oversell dưới tải, đo latency, biểu đồ | Member đơn+giữ hàng |
| 3 | **AI engine: RAG + intent + trích xuất đơn** | Pipeline tool-calling, pgvector retrieval tiếng Việt, vòng xác nhận | **RQ1** (độ chính xác trích xuất) + **RQ3** (RAG vs keyword) | Member AI engine |
| 4 | **Web admin (Next.js)** | Dashboard, luồng hội thoại/đơn/tồn kho, RBAC nav, i18n | Hình ảnh UI + flow demo thật, tích hợp API | Member web |
| 5 | **Web-chat widget + kênh (channel abstraction)** | `IChannelProvider`, Socket.IO realtime, khách ẩn danh tạo/xác nhận đơn, tra cứu đơn | Demo khách chat → AI → đơn → xác nhận → theo dõi status | Member kênh web-chat |

**Điểm cộng gộp:** 5 trụ này *tích hợp* vào nhau (thống nhất qua bảng dữ liệu và contract
chung do core #1 định nghĩa) → đó chính là lý do nói "một hệ thống", không phải 5 app.

---

## 3. Phân bố 100% — mỗi người một con số đo được

Mẹo thuyết trình: **đừng nói "tôi làm 20%"**. Thay bằng "core của tôi chịu trách nhiệm
cho RQ… với con số…". Mỗi người cần nắm ít nhất 1 số liệu:

- Core #2 → **RQ2**: thời gian trung bình/percentile chốt đơn, số lần không oversell.
- Core #3 → **RQ1 + RQ3**: độ chính xác trích xuất (%), recall@k RAG (%), so keyword.
- Core #1 → **contract/bảo mật**: số endpoint, chứng minh không rò rỉ tenant, schema.
- Core #4 → **UI + integration**: hoàn thiện luồng nghiệp vụ end-to-end trên UI.
- Core #5 → **trải nghiệm khách**: từ chat đến đơn, thời gian đáp ứng, AI-resolve rate.

Nếu một core có 2 RQ số liệu (core #3), phần AI dày hơn hẳn → hoặc tách trích xuất đơn
thành core riêng, hoặc người web/chat nhận thêm phần "tra cứu đơn từ chat" để cân khối lượng.

---

## 4. AI hỗ trợ code — công bằng thế nào khi có AI?

Đây là vấn đề thật và hội đồng sẽ hỏi. Nguyên tắc: **AI giúp viết nhanh boilerplate,
không làm thay phần khó.** Mỗi core phải có phần "AI không tự làm được":

- **Correctness / race condition** (core #2): AI không c/m được giữ hàng không oversell —
  chứng minh bằng stress test thật, do người chạy và phân tích.
- **Phương pháp đánh giá** (core #3): dataset tiếng Việt, cách chia, metric, sai số —
  người xây, AI chỉ hỗ trợ script.
- **Thiết kế contract / schema** (core #1): quyết định kiến trúc do người, AI không ra
  quyết định multi-tenant/partition thay bạn.
- **UX + luồng nghiệp vụ** (core #4, #5): AI viết component, người thiết kế bố cục +
  luồng + test hành vi.

**Cách trình bày với hội đồng (cổng thành thật):** "AI tăng tốc mã thường – ta dùng nó
như một công cụ – nhưng phần khó, phần làm sai là sai là trách nhiệm phân tích của tôi."
Càng định lượng càng thuyết phục: "tôi chạy 1000 request đồng thời, giữ hàng không oversell,
p95 = X ms." Đó là thứ AI không sinh ra dù lệnh hay cỡ nào.

---

## 5. Điều chỉnh để 5 core "đủ khó" mà không phình scope

Một số liều để mỗi core có chiều sâu mà không vi phạm scope đã chốt (bỏ Messenger/Zalo
production, không fine-tune, 1 VPS):

- **Core #5 nâng lên khó hơn**: thêm "tra cứu đơn công khai" (khách tự xem status qua
  link/token ngắn hạn) → core này không chỉ là widget mà có cả cơ chế phân phối đơn.
- **Core #3 đủ dày**: intent pipeline + RAG + trích xuất + vòng xác nhận + resolve-rate
  → chia thêm sub-metric cho công bằng.
- **Core #1 thêm giá trị**: "đảm bảo isolation" + "động cơ logs/audit đa tenant" →
  bằng chứng cụ thể cho việc không rò rỉ dữ liệu.

Những cái này **không cần thêm kênh ngoài, không cần fine-tune, không cần scale** — chỉ
thêm độ sâu trong phạm vi backend + web hiện có.

---

## Kết luận

5 core trong một project là **hợp lệ**, miễn:
1. Trình bày là **một hệ thống tích hợp**, không phải 5 app.
2. Mỗi core gán **phần khó + số liệu đo được** cho 1 người → công bằng 100%.
3. Nói rõ vai trò AI: tăng tốc mã, không thay trách nhiệm phần khó.
4. Điều chỉnh nhỏ (tra cứu đơn public, audit/isolate) để cân khối lượng giữa các core.
