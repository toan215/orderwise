'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/full-page-loader';
import { apiFetch, useAuth } from '@/lib/auth';
import { useLocale } from '@/lib/locale';
import { orderStatusBadge, orderStatusLabel } from '@/lib/labels';
import { formatMoney } from '@/lib/utils';
import type { Order } from '@/lib/types';

export default function OrdersPage() {
  const { t } = useLocale();
  const { shop } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!shop) return;
    const sid = shop.id;
    setLoading(true);
    apiFetch<Order[]>(`/shops/${sid}/orders${status ? `?status=${encodeURIComponent(status)}` : ''}`)
      .then((o) => {
        setOrders(o);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Load failed'))
      .finally(() => setLoading(false));
  }, [shop, status]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('order.title')}</h1>
          <p className="text-muted-foreground">{t('dash.subtitle')}</p>
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">{t('common.all')}</option>
          <option>AWAITING_CUSTOMER_CONFIRM</option>
          <option>AWAITING_SELLER_CONFIRM</option>
          <option>CONFIRMED</option>
          <option>DRAFT</option>
          <option>SHIPPING</option>
          <option>COMPLETED</option>
          <option>CANCELLED</option>
        </select>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {t('common.error', { msg: error })}
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
            <ShoppingCart className="h-8 w-8" />
            <p className="text-sm">{t('order.empty')}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-2">
            <div className="divide-y">
              {orders.map((o) => (
                <Link key={o.id} href={`/dashboard/orders/${o.id}`} className="flex items-center justify-between gap-4 py-3 transition-colors hover:bg-accent/50">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{o.orderCode}</span>
                      <Badge variant={orderStatusBadge(o.status)}>{orderStatusLabel(o.status)}</Badge>
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {o.customerName ?? '—'} · {o.items.length} sp
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatMoney(o.total)}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(o.createdAt).toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
