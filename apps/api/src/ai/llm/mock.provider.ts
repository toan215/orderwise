import { Injectable } from '@nestjs/common';
import type { ChatMessage, ChatResult, ChatRequest, LlmProvider, OrderExtraction } from './llm.types';

/**
 * Deterministic provider used when no LLM_API_KEY is configured. It does NOT
 * call any model — it parses the last user message with a small rule set tuned
 * for the demo seed ("áo thun cotton"). Its job is to let the whole intent
 * pipeline, RAG retrieval, stock validation and order creation be exercised
 * end-to-end against the real Postgres/Redis. Swap for `OpenAiProvider` when a
 * real key is available.
 */
@Injectable()
export class MockLlmProvider implements LlmProvider {
  readonly name = 'mock';

  async complete(req: ChatRequest): Promise<ChatResult> {
    // Only answer asynchronously to keep call-site shapes real.
    await new Promise((r) => setImmediate(r));

    const user = [...req.messages].reverse().find((m) => m.role === 'user');
    const text = (user?.content ?? '').toLowerCase();

    if (this.looksLikeOrder(text)) {
      const extraction = this.extractOrder(text, user!.content);
      const content = JSON.stringify(extraction);
      // Decide whether tools are needed: catalog match is done in pipeline via
      // RAG, so here we just emit the extraction and finish.
      return { content, toolCalls: [], finish: 'stop' };
    }

    return {
      content: JSON.stringify({
        intent: 'OTHER',
        question: 'Tôi có thể giúp gì cho bạn? Bạn cần đặt hàng hay tư vấn sản phẩm?',
      } satisfies Partial<OrderExtraction>),
      toolCalls: [],
      finish: 'stop',
    };
  }

  private looksLikeOrder(text: string): boolean {
    const patterns = [
      /(?:mua|đặt|cho tôi|tôi muốn|lấy|chốt|orders?)/,
      /(\d+\s*[áa]o|\d+\s*cái|\d+\s*chiếc|\d+\s*sp|\d+\s*con|\d+\s*kg|\d+\s*ml)/,
      /(\d)\s*[x×*]\s*\d/,
    ];
    return patterns.some((re) => re.test(text));
  }

  private extractOrder(text: string, original: string): OrderExtraction {
    const rawLines: NonNullable<OrderExtraction['rawLines']> = [];
    const quantityRe = /(\d+)\s*(?:cái|chiếc|ái|con|sp|kg|ml|[x×*]\s*(\d))/;

    // Seed-specific: any order-ish message referencing the tee resolves to it.
    const isTee = /(áo|tee|thun|cotton|t-shirt)/.test(text);
    if (isTee) {
      let qty = 1;
      const m = text.match(/(\d+)\s*(?:cái|chiếc|ái|áo|át|sp|con|kg|bộ|set|chai|hộp)\b/);
      if (m) qty = parseInt(m[1], 10);
      else {
        const mx = text.match(/(\d+)\s*[x×*]\s*(\d)/);
        if (mx) qty = parseInt(mx[2], 10) * parseInt(mx[1], 10);
      }
      rawLines.push({ description: 'Áo thun cotton', quantity: Math.max(1, qty), unit: 'cái' });
    }

    const qtyRe = text.match(quantityRe); // fallback generic if not tee
    if (rawLines.length === 0 && qtyRe) {
      rawLines.push({ description: original.trim(), quantity: parseInt(qtyRe[1], 10) });
    }
    if (rawLines.length === 0) {
      rawLines.push({ description: original.trim(), quantity: undefined });
    }

    const phoneRe = original.match(/(0\d{9,10})/);
    return {
      intent: 'PLACE_ORDER',
      rawLines,
      customerInfo: {
        name: 'Khách demo',
        phone: phoneRe?.[1],
        address: original.includes('địa chỉ') ? '123 Demo Street' : undefined,
      },
      deliveryInfo: { address: '123 Demo Street' },
    };
  }
}
