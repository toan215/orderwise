/** LLM provider contract. Swap mock for OpenAI-compatible without touching callers. */

export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ChatMessage {
  role: ChatRole;
  content: string;
  /** Tool call id this message answers (role=tool). */
  toolCallId?: string;
  name?: string;
}

export interface ToolDef {
  name: string;
  description: string;
  /** JSON schema for parameters. */
  parameters: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ChatRequest {
  messages: ChatMessage[];
  tools?: ToolDef[];
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResult {
  content: string;
  toolCalls: ToolCall[];
  finish: 'stop' | 'tool_calls' | 'length' | 'error';
}

export interface LlmProvider {
  readonly name: string;
  complete(req: ChatRequest): Promise<ChatResult>;
}

/** Structured extraction the intent pipeline asks the LLM for. */
export interface OrderExtraction {
  /* User said something that sets up a new order/conversation? */
  intent: 'PLACE_ORDER' | 'ASK_CATALOG' | 'ASK_FAQ' | 'OTHER';
  customerInfo?: {
    name?: string;
    phone?: string;
    address?: string;
  };
  /** One raw line per requested item. */
  rawLines?: Array<{ description: string; quantity?: number; unit?: string }>;
  deliveryInfo?: { note?: string; address?: string };
  /** Free-form follow-up question the user asked (e.g. "giá bao nhiêu"). */
  question?: string;
}

export interface IntentAsk {
  /** Missing fields the customer must supply before we can build the order. */
  ask: Array<{ field: string; label: string; hint?: string }>;
}
