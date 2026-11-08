'use client';
import { useEffect, useState } from 'react';
import { Boxes } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/full-page-loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiFetch, useAuth } from '@/lib/auth';
import { useLocale } from '@/lib/locale';
import type { InventoryItem } from '@/lib/types';

export default function InventoryPage() {
  const { t } = useLocale();
  const { shop } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shop) return;
    setLoading(true);
    apiFetch<InventoryItem[]>(`/shops/${shop.id}/inventory`)
      .then((i) => {
        setItems(i);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Load failed'))
      .finally(() => setLoading(false));
  }, [shop]);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t('inv.title')}</h1>
        <p className="text-muted-foreground">{t('dash.subtitle')}</p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {t('common.error', { msg: error })}
        </div>
      )}

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
            <Boxes className="h-8 w-8" />
            <p className="text-sm">{t('inv.empty')}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('inv.product')}</TableHead>
                  <TableHead className="text-right">{t('inv.onHand')}</TableHead>
                  <TableHead className="text-right">{t('inv.onHold')}</TableHead>
                  <TableHead className="text-right">{t('inv.stockedOut')}</TableHead>
                  <TableHead className="text-right">{t('inv.sellable')}</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((i) => {
                  const low = i.sellable <= i.lowStockAlert;
                  const out = i.sellable <= 0;
                  return (
                    <TableRow key={i.variantId}>
                      <TableCell>
                        <div className="font-medium">{i.variant.name}</div>
                        <div className="text-xs text-muted-foreground">{i.variant.sku ?? i.variant.productId}</div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{i.onHand}</TableCell>
                      <TableCell className="text-right tabular-nums">{i.onHold}</TableCell>
                      <TableCell className="text-right tabular-nums">{i.stockedOut}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{i.sellable}</TableCell>
                      <TableCell>
                        {out ? (
                          <Badge variant="destructive">Hết hàng</Badge>
                        ) : low ? (
                          <Badge variant="warning">{t('inv.low')}</Badge>
                        ) : (
                          <Badge variant="success">{t('inv.ok')}</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
