import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ChatMessage, ChatRequest, ChatResult, LlmProvider, ToolCall } from './llm.types';

/**
 * OpenAI-compatible chat-completions client (works with OpenAI, DeepSeek,
 * OpenRouter, local vLLM/Ollama that expose the same API). Used automatically
 * when LLM_API_KEY is set. Plain fetch — no extra dependency.
 */
@Injectable()
export class OpenAiProvider implements LlmProvider {
  readonly name = 'openai';
  private readonly logger = new Logger(OpenAiProvider.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('LLM_API_KEY', '');
    this.baseUrl = (config.get<string>('LLM_BASE_URL', '') || 'https://api.openai.com/v1').replace(/\/$/, '');
    this.model = config.get<string>('LLM_MODEL', 'gpt-4o-mini');
  }

  async complete(req: ChatRequest): Promise<ChatResult> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages: req.messages.map((m) => this.toWire(m)),
      temperature: req.temperature ?? 0.2,
      ...(req.maxTokens ? { max_tokens: req.maxTokens } : {}),
    };
    if (req.tools?.length) {
      body.tools = req.tools.map((t) => ({
        type: 'function',
        function: { name: t.name, description: t.description, parameters: t.parameters },
      }));
      body.tool_choice = 'auto';
    }

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      this.logger.error(`LLM request failed: ${String(err)}`);
      return { content: '', toolCalls: [], finish: 'error' };
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      this.logger.error(`LLM ${res.status}: ${detail.slice(0, 300)}`);
      return { content: '', toolCalls: [], finish: 'error' };
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string | null; tool_calls?: Array<unknown> }; finish_reason?: string }>;
    };
    const choice = data.choices?.[0];
    const content = choice?.message?.content ?? '';
    const finish = (choice?.finish_reason ?? 'stop') as ChatResult['finish'];

    const toolCalls: ToolCall[] = (choice?.message?.tool_calls ?? []).map((tc) => {
      const t = tc as {
        id?: string;
        function?: { name?: string; arguments?: string };
      };
      let args: Record<string, unknown> = {};
      try {
        args = t.function?.arguments ? JSON.parse(t.function.arguments) : {};
      } catch {
        args = {};
      }
      return { id: t.id ?? `tc-${Math.random().toString(36).slice(2, 8)}`, name: t.function?.name ?? '', arguments: args };
    });

    return { content, toolCalls, finish };
  }

  private toWire(m: ChatMessage): Record<string, unknown> {
    if (m.role === 'tool') {
      return {
        role: 'tool',
        tool_call_id: m.toolCallId,
        // must be a string
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
      };
    }
    return { role: m.role, content: m.content };
  }
}
