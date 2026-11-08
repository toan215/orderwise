'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquare, ShoppingCart, Package, Boxes, ArrowRight, TriangleAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/full-page-loader';
import { apiFetch } from '@/lib/auth';
import { useAuth } from '@/lib/auth';
import { useLocale } from '@/lib/locale';
import { orderStatusBadge, orderStatusLabel } from '@/lib/labels';
import { formatMoney } from '@/lib/utils';
import type { Conversation, Order, InventoryItem } from '@/lib/types';

export default function DashboardPage() {
  const { t } = useLocale();
  const { shop } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  useEffect(() => {
    if (!shop) return;
    const sid = shop.id;
    setLoading(true);
    Promise.all([
      apiFetch<Conversation[]>('/shops/' + sid + '/conversations'),
      apiFetch<Order[]>('/shops/' + sid + '/orders'),
      apiFetch<InventoryItem[]>('/shops/' + sid + '/inventory'),
    ])
      .then(([c, o, i]) => {
        setConvs(c);
        setOrders(o);
        setInventory(i);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Load failed'))
      .finally(() => setLoading(false));
  }, [shop]);

  if (loading) return <Spinner />;

  const sellable = inventory.reduce((s, i) => s + i.sellable, 0);
  const lowStock = inventory.filter((i) => i.sellable <= 5);
  const openConvs = convs.filter((c) => c.status === 'OPEN');
  const recent = orders.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('dash.title')}</h1>
        <p className="text-muted-foreground">{t('dash.subtitle')}</p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {t('common.error', { msg: error })}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t('dash.openConversations')} value={openConvs.length} icon={<MessageSquare className="h-5 w-5" />} />
        <Stat label={t('dash.orders')} value={orders.length} icon={<ShoppingCart className="h-5 w-5" />} />
        <Stat label={t('dash.sellable')} value={sellable} icon={<Boxes className="h-5 w-5" />} />
        <Stat label={t('dash.lowStock')} value={lowStock.length} icon={<TriangleAlert className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t('dash.recentOrders')}</CardTitle>
            <Link href="/dashboard/orders" className="flex items-center gap-1 text-sm text-primary hover:underline">
              {t('dash.viewAll')} <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {recent.length === 0 && <p className="text-sm text-muted-foreground">{t('order.empty')}</p>}
            {recent.map((o) => (
              <Link
                key={o.id}
                href={`/dashboard/orders/${o.id}`}
                className="flex items-center justify-between rounded-md border px-3 py-2.5 text-sm transition-colors hover:bg-accent"
              >
                <div>
                  <div className="font-medium">{o.orderCode}</div>
                  <div className="text-xs text-muted-foreground">{o.customerName ?? '—'}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{formatMoney(o.total)}</div>
                  <Badge variant={orderStatusBadge(o.status)}>{orderStatusLabel(o.status)}</Badge>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('inv.sellable')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {inventory.length === 0 && <p className="text-sm text-muted-foreground">{t('inv.empty')}</p>}
            {lowStock.length === 0 && inventory.length > 0 && (
              <p className="text-sm text-muted-foreground">
                <Package className="mr-1 inline h-4 w-4" /> Không có mặt hàng sắp hết.
              </p>
            )}
            {lowStock.map((i) => (
              <div key={i.variantId} className="flex items-center justify-between rounded-md border px-3 py-2.5 text-sm">
                <span className="truncate font-medium">{i.variant.name}</span>
                <Badge variant={i.sellable === 0 ? 'destructive' : 'warning'}>
                  {i.sellable} {t('inv.sellable')}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-accent-foreground">{icon}</div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}
