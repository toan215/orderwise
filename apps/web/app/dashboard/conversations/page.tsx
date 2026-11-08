'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquare, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/full-page-loader';
import { apiFetch, useAuth } from '@/lib/auth';
import { useLocale } from '@/lib/locale';
import { conversationStatusBadge } from '@/lib/labels';
import type { Conversation } from '@/lib/types';

export default function ConversationsPage() {
  const { t } = useLocale();
  const { shop } = useAuth();
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!shop) return;
    const sid = shop.id;
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (status) params.set('status', status);
    apiFetch<Conversation[]>(`/shops/${sid}/conversations?${params.toString()}`)
      .then((c) => {
        setConvs(c);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Load failed'))
      .finally(() => setLoading(false));
  }, [shop, q, status]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t('conv.title')}</h1>
        <p className="text-muted-foreground">{t('dash.subtitle')}</p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {t('common.error', { msg: error })}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('conv.search')} className="pl-9" />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">{t('common.all')}</option>
          <option value="OPEN">OPEN</option>
          <option value="HANDED_OVER">HANDED_OVER</option>
          <option value="PAUSED">PAUSED</option>
          <option value="CLOSED">CLOSED</option>
        </select>
      </div>

      {loading ? (
        <Spinner />
      ) : convs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
            <MessageSquare className="h-8 w-8" />
            <p className="text-sm">{t('conv.empty')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {convs.map((c) => (
            <Link key={c.id} href={`/dashboard/conversations/${c.id}`}>
              <Card className="h-full transition-colors hover:border-primary">
                <CardContent className="p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <Badge variant={conversationStatusBadge(c.status)}>{c.status}</Badge>
                    {!c.aiEnabled && <Badge variant="secondary">AI off</Badge>}
                    {c._count && <span className="text-xs text-muted-foreground">{c._count.messages} msgs</span>}
                  </div>
                  <p className="truncate font-medium">{c.customer.displayName ?? c.customer.phone ?? 'Khách'}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.title ?? c.channel.name}</p>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {c.channel.type} · {c.customer.phone ?? '—'}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
