'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/full-page-loader';
import { apiFetch, useAuth } from '@/lib/auth';
import { useLocale } from '@/lib/locale';
import { orderStatusBadge, orderStatusLabel } from '@/lib/labels';
import { formatMoney } from '@/lib/utils';
import type { Order } from '@/lib/types';

export default function OrderDetailPage() {
  const { t } = useLocale();
  const { shop, hasCapability } = useAuth();
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const sid = shop?.id;

  const load = () => {
    if (!sid) return;
    setError(null);
    apiFetch<Order>(`/shops/${sid}/orders/${orderId}`)
      .then(setOrder)
      .catch((e) => setError(e instanceof Error ? e.message : 'Load failed'));
  };
  useEffect(load, [sid, orderId]);

  const act = async (action: (sid: string) => Promise<unknown>) => {
    if (!sid) return;
    setBusy(true);
    try {
      await action(sid);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  if (!order) {
    return error ? (
      <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">{error}</div>
    ) : (
      <Spinner />
    );
  }

  const canManage = hasCapability('orders.manage');
  const canCreate = hasCapability('orders.create');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/orders" className="flex h-8 w-8 items-center justify-center rounded-md border hover:bg-accent">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{order.orderCode}</h1>
            <Badge variant={orderStatusBadge(order.status)}>{orderStatusLabel(order.status)}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {order.customerName ?? '—'} · {order.customerPhone ?? '—'}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('order.items')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {order.items.map((it) => (
              <div key={it.id} className="flex items-center justify-between border-b py-2 text-sm last:border-0">
                <div>
                  <div className="font-medium">{it.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {it.sku ?? '—'} × {it.quantity}
                  </div>
                </div>
                <div className="text-right">
                  <div>{formatMoney(it.unitPrice)}</div>
                  <div className="text-xs text-muted-foreground">{formatMoney(it.lineTotal)}</div>
                </div>
              </div>
            ))}
            {order.items.length === 0 && <p className="text-sm text-muted-foreground">{t('order.empty')}</p>}

            <div className="space-y-1 pt-2 text-sm">
              <Row label={t('order.subtotal')} value={formatMoney(order.subtotal)} />
              <Row label={t('order.shipping')} value={formatMoney(order.shippingFee)} />
              <Row label={t('order.discount')} value={formatMoney(order.discount)} />
              <Row label={t('order.total')} value={formatMoney(order.total)} bold />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t('order.status')}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">{t('order.payment')}</div>
                <div className="font-medium">{order.paymentStatus}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{t('order.delivery')}</div>
                <div className="font-medium">{order.deliveryStatus}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{t('order.createdAt')}</div>
                <div className="font-medium">{new Date(order.createdAt).toLocaleDateString('vi-VN')}</div>
              </div>
              {order.shippingAddress && (
                <div>
                  <div className="text-xs text-muted-foreground">Địa chỉ</div>
                  <div className="font-medium">{order.shippingAddress}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status-driven actions (mirror of backend state machine) */}
          {order.status === 'AWAITING_SELLER_CONFIRM' && canManage && (
            <div className="space-y-2">
              <Button className="w-full" disabled={busy} onClick={() => act((s) => apiFetch(`/shops/${s}/orders/${orderId}/confirm`, { method: 'POST' }))}>
                <CheckCircle2 className="h-4 w-4" /> {t('order.confirm')}
              </Button>
            </div>
          )}
          {order.status !== 'CANCELLED' && order.status !== 'COMPLETED' && (canManage || canCreate) && (
            <Button
              variant="destructive"
              className="w-full"
              disabled={busy}
              onClick={() => act((s) => apiFetch(`/shops/${s}/orders/${orderId}/cancel`, { method: 'POST', body: JSON.stringify({ reason: 'SELLER_CANCELLED' }) }))}
            >
              <XCircle className="h-4 w-4" /> {t('order.cancel')}
            </Button>
          )}

          {order.history && order.history.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Lịch sử</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {order.history.map((h) => (
                  <div key={h.id} className="text-xs">
                    <span className="font-medium">{h.action}</span>
                    <span className="mx-1 text-muted-foreground">·</span>
                    <span className="text-muted-foreground">{new Date(h.createdAt).toLocaleString('vi-VN')}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? 'font-bold' : ''}>{value}</span>
    </div>
  );
}
