/**
 * AI module for Orderwise — RAG + tool-calling + intent pipeline + BullMQ workers.
 *
 * Depends on: PrismaModule, InventoryModule (for stock checks/orders).
 * No LLM key required to run: when LLM_API_KEY is empty the factory returns a
 * deterministic Mock provider so the whole intent pipeline is exercised E2E
 * against the real Postgres/Redis. Add LLM_API_KEY + LLM_BASE_URL + EMBEDDING
 * key to switch to real OpenAI-compatible inference (see ai/llm + ai/embedding).
 */

export const AI_QUEUES = {
  /** Inbound customer message -> AI response (processed synchronously by default,
   *  queued when a worker is available to keep HTTP fast). */
  INTENT: 'ow-ai-intent',
  /** Expire AWAITING_CUSTOMER_CONFIRM orders and release their stock holds. */
  HOLD_TIMEOUT: 'ow-ai-hold-timeout',
  /** Periodic sweep that expires missed awaiting-confirm orders. */
  HOLD_TIMEOUT_SCAN: 'ow-ai-hold-timeout-scan',
  /** Retry outbound messages stuck in PENDING/FAILED. */
  DELIVERY_RETRY: 'ow-ai-delivery-retry',
  /** Compute embeddings for catalog/policy/FAQ rows (RAG). */
  EMBEDDING: 'ow-ai-embedding',
} as const;

export type AiQueue = (typeof AI_QUEUES)[keyof typeof AI_QUEUES];
