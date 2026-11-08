import type { ToolDef } from '../llm/llm.types';

/**
 * Tool schemas handed to the LLM for tool-calling. When the real OpenAI
 * provider is active the model can call these; the pipeline executes them.
 * With the mock provider the pipeline calls the same logic directly.
 */
export const AI_TOOLS: ToolDef[] = [
  {
    name: 'search_catalog',
    description: 'Tìm kiếm sản phẩm trong cửa hàng theo từ khoá (tên, sku). Trả về các variant khả dụng kèm giá và tồn có thể bán.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Từ khoá mô tả sản phẩm cần tìm' },
      },
      required: ['query'],
    },
  },
  {
    name: 'create_order_draft',
    description: 'Tạo đơn hàng nháp từ các dòng đã xác định (variantId + quantity). Chưa giữ hàng.',
    parameters: {
      type: 'object',
      properties: {
        lines: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              variantId: { type: 'string' },
              quantity: { type: 'number' },
            },
            required: ['variantId', 'quantity'],
          },
        },
        customer: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            phone: { type: 'string' },
            address: { type: 'string' },
          },
        },
      },
      required: ['lines'],
    },
  },
  {
    name: 'request_customer_confirm',
    description: 'Gửi đơn cho khách xác nhận: đặt giữ hàng (hold) với TTL, chống bán vượt tồn.',
    parameters: {
      type: 'object',
      properties: { orderId: { type: 'string' } },
      required: ['orderId'],
    },
  },
  {
    name: 'lookup_policy',
    description: 'Tra cứu chính sách cửa hàng (giao hàng, đổi trả) bằng từ khoá.',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query'],
    },
  },
  {
    name: 'hand_to_seller',
    description: 'Bàn giao hội thoại cho nhân viên khi ngoài phạm vi AI.',
    parameters: {
      type: 'object',
      properties: { reason: { type: 'string' } },
      required: ['reason'],
    },
  },
];
