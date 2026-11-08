'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send, Bot, UserRound, Headset, UserRoundCog, Paperclip } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/full-page-loader';
import { apiFetch, useAuth } from '@/lib/auth';
import { useLocale } from '@/lib/locale';
import { conversationStatusBadge, originLabel } from '@/lib/labels';
import { cn } from '@/lib/utils';
import type { Conversation, Message } from '@/lib/types';

function OriginIcon({ origin }: { origin: string }) {
  if (origin === 'AI') return <Bot className="h-3.5 w-3.5" />;
  if (origin === 'SELLER') return <Headset className="h-3.5 w-3.5" />;
  if (origin === 'SYSTEM') return <UserRoundCog className="h-3.5 w-3.5" />;
  return <UserRound className="h-3.5 w-3.5" />;
}

export default function ConversationThreadPage() {
  const { t } = useLocale();
  const { shop } = useAuth();
  const { convId } = useParams<{ convId: string }>();
  const [conv, setConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const sid = shop?.id;

  useEffect(() => {
    if (!sid) return;
    setError(null);
    Promise.all([
      apiFetch<Conversation>(`/shops/${sid}/conversations/${convId}`),
      apiFetch<Message[]>(`/shops/${sid}/conversations/${convId}/messages`),
    ])
      .then(([c, m]) => {
        setConv(c);
        setMessages(m);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Load failed'));
  }, [sid, convId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  async function send() {
    const content = draft.trim();
    if (!content || !sid) return;
    setBusy(true);
    try {
      const msg = await apiFetch<Message>(`/shops/${sid}/conversations/${convId}/send`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
      setMessages((m) => [...m, msg]);
      setDraft('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Send failed');
    } finally {
      setBusy(false);
    }
  }

  async function takeOver() {
    if (!sid) return;
    try {
      const c = await apiFetch<Conversation>(`/shops/${sid}/conversations/${convId}/take-over`, { method: 'POST' });
      setConv(c);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  }

  async function toggleAi(paused: boolean) {
    if (!sid) return;
    try {
      const c = await apiFetch<Conversation>(`/shops/${sid}/conversations/${convId}/pause-ai`, {
        method: 'POST',
        body: JSON.stringify({ paused }),
      });
      setConv(c);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  }

  if (!conv) {
    return error ? (
      <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">{error}</div>
    ) : (
      <Spinner />
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col space-y-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/conversations" className="flex h-8 w-8 items-center justify-center rounded-md border hover:bg-accent">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold">{conv.customer.displayName ?? conv.customer.phone ?? 'Khách'}</span>
            <Badge variant={conversationStatusBadge(conv.status)}>{conv.status}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {conv.channel.name} ({conv.channel.type}) · {conv.customer.phone ?? '—'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={conv.aiEnabled ? 'outline' : 'secondary'}
            size="sm"
            onClick={() => toggleAi(conv.aiEnabled)}
          >
            <Bot className="h-4 w-4" />
            {conv.aiEnabled ? t('conv.aiOn') : t('conv.aiOff')}
          </Button>
          <Button variant="outline" size="sm" onClick={takeOver} disabled={conv.status === 'HANDED_OVER'}>
            <Headset className="h-4 w-4" />
            {t('conv.takeOver')}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">{error}</div>
      )}

      {/* Messages */}
      <Card className="flex-1 overflow-hidden">
        <CardContent className="flex h-full flex-col gap-3 overflow-y-auto p-4">
          {messages.length === 0 && <p className="m-auto text-sm text-muted-foreground">{t('conv.empty')}</p>}
          {messages.map((m) => {
            const inbound = m.direction === 'INBOUND';
            return (
              <div key={m.id} className={cn('flex', inbound ? 'justify-start' : 'justify-end')}>
                <div
                  className={cn(
                    'max-w-[75%] rounded-lg px-3 py-2 text-sm shadow-sm',
                    inbound ? 'bg-muted' : 'bg-primary text-primary-foreground',
                  )}
                >
                  <div className={cn('mb-0.5 flex items-center gap-1 text-[10px]', inbound ? 'text-muted-foreground' : 'text-primary-foreground/70')}>
                    <OriginIcon origin={m.origin} />
                    {originLabel(m.origin)}
                  </div>
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  <div className={cn('mt-1 text-right text-[10px]', inbound ? 'text-muted-foreground' : 'text-primary-foreground/70')}>
                    {new Date(m.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </CardContent>
      </Card>

      {/* Composer */}
      <div className="flex items-end gap-2">
        <Button variant="ghost" size="icon" className="shrink-0" disabled>
          <Paperclip className="h-4 w-4" />
        </Button>
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t('conv.typePlaceholder')}
          className="min-h-[52px] flex-1"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <Button onClick={send} disabled={busy || !draft.trim()}>
          {t('conv.send')} <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
