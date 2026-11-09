# Orderwise — Ý tưởng mới (ideas)

Tổng hợp ý tưởng bổ sung cho đồ án, đối chiếu với scope đã chốt
(không mở rộng kênh Messenger/Zalo production, không fine-tune LLM,
không microservice/k8s/OAuth2 enterprise; deploy 1 VPS + Docker Compose,
~80% hoàn thiện, 3 bộ số liệu research RQ1/RQ2/RQ3).

Trạng thái mỗi ý được đánh dấu bằng checkbox (cần chốt ưu tiên trước khi làm).

## Ưu tiên cao — nâng demo + củng cố research

### [ ] 1. Trang theo dõi đơn public (khách tự xem status, không cần login)

- Hệ thống hiện gần như toàn admin-side; thiếu mặt "khách thật chạm được".
- Reuse sẵn state machine order (DRAFT → request-confirm →
  customer-confirm → confirm → cancel).
- Thêm 1 route public + token ngắn hạn nhúng vào SMS / link web-chat.
- Lợi ích: minh chứng link sống rõ nhất, GVHD thấy vòng đời đơn, không cần ML.

### [ ] 2. Chat tra cứu đơn hàng của khách (tool-call từ AI)

- AI hiện trả lời bằng RAG static content.
- Nối tool "get order status / lịch sử đơn theo SĐT" → demo "hữu ích thật".
- Củng cố RQ3 bằng metric khách quan: **AI-resolve rate** (tỉ lệ không cần
  take-over), đo được từ dữ liệu take-over / pause-ai đã có sẵn.

### [ ] 3. Nhập giọng nói tiếng Việt trong web-chat (Web Speech API, miễn phí)

- Không cần backend STT; dùng browser SpeechRecognition.
- Nhập đơn bằng nói thay vì gõ → nổi bật khi demo hội đồng.
- Cho RQ1 thêm một bộ kết quả: độ chính xác trích xuất khi input speech→text.
- Rủi ro: độ chính xác tiếng Việt của browser không ổn định → giữ fallback bàn phím.

## Ưu tiên trung bình — làm sản phẩm "~80% hoàn thiện"

### [ ] 4. Danh sách chờ khi hết hàng (waiting list → auto-notify khi có lại)

- Nối vào logic onHold / stockedOut đã có.
- Khép vòng: hết hàng → khách chờ → có lại → báo khi khách online (web-chat).

### [ ] 5. Dashboard phân tích bán hàng

- Doanh thu theo ngày, best-seller, tỉ lệ giữ hàng chuyển thành đơn.
- GVHD mê hình ảnh; số liệu đổ vào RQ2 (stress/anti-oversell) và RQ3.
- Dùng recharts hoặc SVG đơn giản, không cần chart lib nặng.

### [ ] 6. Voucher / giảm giá (code + % / số tiền)

- Khép nghiệp vụ thương mại còn thiếu, dễ ăn điểm mức độ hoàn thiện.

## Không nên làm (tranh scope creep)

- Payment thật (VnPay/Momo) — tích hợp rủi ro, không phải module core;
  chỉ làm "extension" nếu còn dư thời lượng.
- Voucher chỉ làm nếu còn dư dùng thời lượng (xem mục 6).
- Thêm kênh Messenger/Zalo thật — đã chốt cắt.

## Gợi ý tập trung

Làm trước mục **1** (trang track public) + **2** (chat tra cứu đơn + metric
resolve-rate): cả hai củng cố demo VÀ research cùng lúc, chi phí thấp.
