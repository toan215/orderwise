'use client';
import Link from 'next/link';
import {
  LayoutDashboard,
  MessageSquare,
  ShoppingCart,
  Package,
  Boxes,
  Store,
  LogOut,
  Languages,
  ChevronsUpDown,
  Check,
} from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { useLocale } from '@/lib/locale';
import { roleLabel } from '@/lib/labels';
import { Button } from '@/components/ui/button';

const NAV = [
  { href: '/dashboard', key: 'nav.dashboard', icon: LayoutDashboard },
  { href: '/dashboard/conversations', key: 'nav.conversations', icon: MessageSquare },
  { href: '/dashboard/orders', key: 'nav.orders', icon: ShoppingCart },
  { href: '/dashboard/inventory', key: 'nav.inventory', icon: Boxes },
  { href: '/dashboard/products', key: 'nav.products', icon: Package },
];

export function Sidebar({ pathname }: { pathname: string }) {
  const { t, locale, setLocale } = useLocale();
  const { user, shops, shop, selectShop, logout } = useAuth();
  const router = useRouter();
  const [shopOpen, setShopOpen] = useState(false);

  const active = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r bg-card">
      <div className="flex items-center gap-2 border-b px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Store className="h-4 w-4" />
        </div>
        <span className="text-sm font-bold">{t('appName')}</span>
      </div>

      {/* Shop switcher */}
      {shop && shops.length > 0 && (
        <div className="relative border-b p-3">
          <button
            type="button"
            onClick={() => setShopOpen((v) => !v)}
            className="flex w-full items-center gap-2 rounded-md border px-2.5 py-2 text-left text-sm hover:bg-accent"
          >
            <div className="flex-1 leading-tight">
              <div className="truncate font-medium">{shop.name}</div>
              <div className="text-xs text-muted-foreground">{roleLabel(shop.role)}</div>
            </div>
            <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
          </button>
          {shopOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShopOpen(false)} />
              <div className="absolute left-3 right-3 top-full z-20 mt-1 rounded-md border bg-popover p-1 shadow-md">
                {shops.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                    onClick={() => {
                      selectShop(s);
                      setShopOpen(false);
                      router.push('/dashboard');
                    }}
                  >
                    <span className="truncate">{s.name}</span>
                    {s.id === shop.id && <Check className="h-3.5 w-3.5" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV.map(({ href, key, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
              active(href) ? 'bg-accent text-accent-foreground' : 'text-muted-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {t(key)}
          </Link>
        ))}
      </nav>

      <div className="border-t p-3">
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="text-xs font-medium text-muted-foreground">
            {locale === 'vi' ? 'Ngôn ngữ' : 'Language'}
          </span>
          <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => setLocale(locale === 'vi' ? 'en' : 'vi')}>
            <Languages className="h-3.5 w-3.5" />
            {locale === 'vi' ? 'EN' : 'VI'}
          </Button>
        </div>
        <div className="flex w-full items-center gap-2 rounded-md bg-muted px-3 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {(user?.fullName?.[0] ?? '?').toUpperCase()}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-sm font-medium">{user?.fullName}</div>
            <div className="truncate text-xs text-muted-foreground">{user?.email}</div>
          </div>
          <button
            type="button"
            aria-label={t('auth.logout')}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => {
              logout();
              router.replace('/login');
            }}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
