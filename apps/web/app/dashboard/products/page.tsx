'use client';
import { useEffect, useState } from 'react';
import { Package } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/full-page-loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiFetch, useAuth } from '@/lib/auth';
import { useLocale } from '@/lib/locale';
import { formatMoney } from '@/lib/utils';
import type { Product } from '@/lib/types';

export default function ProductsPage() {
  const { t } = useLocale();
  const { shop } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shop) return;
    setLoading(true);
    apiFetch<Product[]>(`/shops/${shop.id}/products`)
      .then((p) => {
        setProducts(p);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Load failed'))
      .finally(() => setLoading(false));
  }, [shop]);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t('prod.title')}</h1>
        <p className="text-muted-foreground">{t('dash.subtitle')}</p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {t('common.error', { msg: error })}
        </div>
      )}

      {products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
            <Package className="h-8 w-8" />
            <p className="text-sm">{t('prod.empty')}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('prod.name')}</TableHead>
                  <TableHead>{t('prod.sku')}</TableHead>
                  <TableHead>Biến thể</TableHead>
                  <TableHead className="text-right">{t('prod.price')}</TableHead>
                  <TableHead>{t('prod.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => {
                  const cheapest = p.variants?.length
                    ? Math.min(...p.variants.map((v) => Number(v.price)))
                    : p.variants?.[0]?.price;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-muted-foreground">{p.sku ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{p.variants?.length ?? 0}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {cheapest != null && cheapest !== Infinity ? formatMoney(cheapest) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.status === 'ACTIVE' ? 'success' : p.status === 'DRAFT' ? 'secondary' : 'muted'}>
                          {p.status}
                        </Badge>
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
