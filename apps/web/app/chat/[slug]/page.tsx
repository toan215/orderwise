'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { Bot, Send, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const TOKEN_KEY = 'ow_webchat_token';

interface WireMsg {
  id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  origin: string;
  content: string;
  createdAt: string;
}

interface AiReply {
  text: string;
  orderId?: string;
  orderCode?: string;
  intent: string;
}

function getToken(): string {
  const k = 'ow_webchat_tok_' + (typeof window !== 'undefined' ? window.location.pathname.replace(/[^a-z0-9]/gi, '') : 'x');
  // Per-page token: stable per shop widget so a reload keeps the same conversation.
  if (typeof localStorage !== 'undefined') {
    let t = localStorage.getItem(k);
    if (!t) {
      t = `wt-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
      localStorage.setItem(k, t);
    }
    return t;
  }
  return 'wt-now';
}

/**
 * Customer-facing web-chat widget. Anonymous: a token is kept in localStorage so
 * a refresh keeps the same conversation. Talks to the public API (`/public/...`,
 * proxied to the Nest API in dev) which drives the AI intake pipeline.
 */
export default function ChatWidgetPage() {
  const { slug } = useParams<{ slug: string }>();
  const [shopName, setShopName] = useState('Cửa hàng');
  const [messages, setMessages] = useState<WireMsg[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState(false);
  const [shopError, setShopError] = useState<string | null>(null);
  const [pendingOrder, setPendingOrder] = useState<{ orderId: string; orderCode?: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const tokenRef = useRef<string>('');

  const start = useCallback(async () => {
    if (!slug || started || tokenRef.current) return;
    tokenRef.current = getToken();
    try {
      const res = await fetch(`/public/web-chat/${slug}/start?token=${encodeURIComponent(tokenRef.current)}`);
      if (!res.ok) {
        setShopError(res.status === 404 ? 'Không tìm thấy cửa hàng này.' : 'Không thể kết nối đến cửa hàng. Vui lòng thử lại sau.');
        setStarted(true);
        return;
      }
      const data = await res.json();
      setShopName(data.shopName ?? 'Cửa hàng');
      setStarted(true);
      const msgs = await fetch(`/public/web-chat/${slug}/messages?token=${encodeURIComponent(tokenRef.current)}`).then((r) => r.json());
      setMessages(msgs);
    } catch {
      setShopError('Không thể kết nối đến máy chủ.');
      setStarted(true);
    }
  }, [slug, started]);

  useEffect(() => {
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  async function send() {
    const content = draft.trim();
    if (!content || busy || !slug) return;
    setBusy(true);
    // optimistic customer bubble
    setMessages((m) => [
      ...m,
      { id: `tmp-${Date.now()}`, direction: 'INBOUND', origin: 'CUSTOMER', content, createdAt: new Date().toISOString() },
    ]);
    setDraft('');
    try {
      const res = await fetch(`/public/web-chat/${slug}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenRef.current, content }),
      });
      if (!res.ok) {
        await res.text().catch(() => {});
        if (res.status === 404) throw new Error('Không tìm thấy cửa hàng này.');
        throw new Error('Đã xảy ra lỗi khi gửi tin nhắn. Vui lòng thử lại.');
      }
      const reply: AiReply = await res.json();
      setPendingOrder(reply.orderId ? { orderId: reply.orderId, orderCode: reply.orderCode } : null);
      setMessages((m) => [
        ...m,
        {
          id: `ai-${Date.now()}`,
          direction: 'OUTBOUND' as const,
          origin: 'AI',
          content: reply.text,
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          id: `err-${Date.now()}`,
          direction: 'OUTBOUND' as const,
          origin: 'SYSTEM',
          content: e instanceof Error ? e.message : 'Đã xảy ra lỗi, vui lòng thử lại.',
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function confirmOrder() {
    if (!pendingOrder || !slug) return;
    setBusy(true);
    try {
      await fetch(`/public/web-chat/${slug}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenRef.current, orderId: pendingOrder.orderId }),
      }).then((r) => {
        if (!r.ok) throw new Error('confirm failed');
        return r.json();
      });
      setPendingOrder(null);
      setMessages((m) => [
        ...m,
        {
          id: `ai-${Date.now()}`,
          direction: 'OUTBOUND' as const,
          origin: 'AI',
          content: 'Cảm ơn bạn đã xác nhận! Nhân viên sẽ sớm liên hệ để hoàn tất. 🎉',
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          id: `err-${Date.now()}`,
          direction: 'OUTBOUND' as const,
          origin: 'SYSTEM',
          content: e instanceof Error ? e.message : 'Không xác nhận được đơn hàng.',
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="flex h-[86vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b bg-primary px-4 py-3 text-primary-foreground">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-foreground/15">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">{shopName}</p>
            <p className="text-xs text-primary-foreground/75">Trợ lý bán hàng AI — online</p>
          </div>
        </div>

        {shopError ? (
          <div className="flex flex-1 items-center justify-center p-6 text-center">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{shopError}</p>
              <p className="mt-1.5 text-xs text-muted-foreground/70">
                Vui lòng kiểm tra lại đường dẫn hoặc liên hệ cửa hàng.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {!started && <p className="text-center text-sm text-muted-foreground">Đang kết nối…</p>}
          {messages.length === 0 && started && (
            <p className="text-center text-sm text-muted-foreground">
              Xin chào! Bạn cần mua gì cho mình xem nhé? 🛍️
            </p>
          )}
          {messages.map((m) => {
            const inbound = m.direction === 'INBOUND';
            const isSystem = m.origin === 'SYSTEM';
            return (
              <div key={m.id} className={cn('flex', inbound ? 'justify-start' : 'justify-end')}>
                <div
                  className={cn(
                    'max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm shadow-sm',
                    inbound ? 'rounded-bl-sm bg-muted' : isSystem ? 'rounded-br-sm bg-amber-100 text-amber-900' : 'rounded-br-sm bg-primary text-primary-foreground',
                  )}
                >
                  {m.content}
                </div>
              </div>
            );
          })}

          {pendingOrder && (
            <div className="flex justify-end">
              <div className="flex items-center gap-2 rounded-2xl border border-primary bg-primary/5 px-3 py-2">
                <ButtonConfirm busy={busy} onClick={confirmOrder}>
                  <Check className="h-4 w-4" /> Xác nhận đơn {pendingOrder.orderCode ?? ''}
                </ButtonConfirm>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <div className="flex items-center gap-2 border-t p-3">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Nhập tin nhắn…"
            className="h-10 flex-1 rounded-full border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={send}
            disabled={busy || !draft.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
            aria-label="Gửi"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
          </>
        )}
      </div>
    </main>
  );
}

function ButtonConfirm({ children, busy, onClick }: { children: React.ReactNode; busy: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-40"
    >
      {children}
    </button>
  );
}
