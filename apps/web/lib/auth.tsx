'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthResponse, MeResponse, MeUser, MyShop } from './types';

// ---------------------------------------------------------------------------
// Token storage (persisted per browser session). Tokens are NOT in cookies so
// nothing depends on a server-side secret; everything flows through fetch.
// ---------------------------------------------------------------------------
const ACCESS_KEY = 'ow_access';
const REFRESH_KEY = 'ow_refresh';

export interface AuthState {
  user: MeUser | null;
  shops: MyShop[];
  /** Currently selected shop for the dashboard (persisted per browser). */
  shop: MyShop | null;
  loading: boolean;
  ready: boolean;
  login: (email: string, password: string) => Promise<MeUser>;
  register: (opts: { email: string; password: string; fullName: string; phone?: string }) => Promise<MeUser>;
  logout: () => void;
  refreshMe: () => Promise<MeResponse | null>;
  selectShop: (shop: MyShop) => void;
  hasCapability: (cap: string) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);
const SHOP_KEY = 'ow_shop';

function readTokens() {
  if (typeof window === 'undefined') return { access: null, refresh: null };
  return { access: localStorage.getItem(ACCESS_KEY), refresh: localStorage.getItem(REFRESH_KEY) };
}

let _refreshPromise: Promise<boolean> | null = null;

/** Single-flight token refresh; returns true when a valid access token exists. */
export async function ensureAccessToken(): Promise<string | null> {
  const cur = readTokens();
  if (cur.access) return cur.access;
  if (!cur.refresh) return null;
  if (!_refreshPromise) {
    _refreshPromise = (async () => {
      try {
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: cur.refresh }),
        });
        if (!res.ok) {
          localStorage.removeItem(ACCESS_KEY);
          localStorage.removeItem(REFRESH_KEY);
          return false;
        }
        const data: AuthResponse = await res.json();
        localStorage.setItem(ACCESS_KEY, data.accessToken);
        localStorage.setItem(REFRESH_KEY, data.refreshToken);
        return true;
      } finally {
        _refreshPromise = null;
      }
    })();
  }
  return (await _refreshPromise) ? readTokens().access : null;
}

/** Authenticated fetch that attaches Bearer + x-shop-id and auto-refreshes once on 401. */
export async function apiFetch<T = unknown>(path: string, init: RequestInit = {}, shopId?: string): Promise<T> {
  let access = await ensureAccessToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init.headers as Record<string, string>) };
  if (access) headers.Authorization = `Bearer ${access}`;
  if (shopId) headers['x-shop-id'] = shopId;

  let res = await fetch(`/api${path}`, { ...init, headers });
  if (res.status === 401 && access) {
    localStorage.removeItem(ACCESS_KEY);
    access = await ensureAccessToken();
    if (access) {
      headers.Authorization = `Bearer ${access}`;
      res = await fetch(`/api${path}`, { ...init, headers });
    }
  }
  if (!res.ok) {
    let msg = `Request failed: ${res.status}`;
    try {
      const body = await res.json();
      if (body?.message) msg = Array.isArray(body.message) ? body.message.join(', ') : String(body.message);
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeUser | null>(null);
  const [shops, setShops] = useState<MyShop[]>([]);
  const [shop, setShop] = useState<MyShop | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    const access = await ensureAccessToken();
    if (!access) {
      setUser(null);
      setShops([]);
      setShop(null);
      return null;
    }
    const me = await apiFetch<MeResponse>('/auth/me');
    setUser(me.user);
    setShops(me.shops);
    const savedId =
      typeof window !== 'undefined' ? localStorage.getItem(SHOP_KEY) : null;
    const target = me.shops.find((s) => s.id === savedId) ?? me.shops[0] ?? null;
    setShop(target);
    return me;
  }, []);

  useEffect(() => {
    refreshMe().finally(() => setLoading(false));
  }, [refreshMe]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        let msg = 'Login failed';
        try {
          const b = await res.json();
          msg = Array.isArray(b?.message) ? b.message.join(', ') : String(b?.message ?? msg);
        } catch { /* ignore */ }
        throw new Error(msg);
      }
      const data: AuthResponse = await res.json();
      localStorage.setItem(ACCESS_KEY, data.accessToken);
      localStorage.setItem(REFRESH_KEY, data.refreshToken);
      await refreshMe();
      return data.user;
    },
    [refreshMe],
  );

  const register = useCallback(
    async (opts: { email: string; password: string; fullName: string; phone?: string }) => {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts),
      });
      if (!res.ok) throw new Error('Registration failed');
      const data: AuthResponse = await res.json();
      localStorage.setItem(ACCESS_KEY, data.accessToken);
      localStorage.setItem(REFRESH_KEY, data.refreshToken);
      await refreshMe();
      return data.user;
    },
    [refreshMe],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    setUser(null);
    setShops([]);
    setShop(null);
  }, []);

  const selectShop = useCallback((s: MyShop) => {
    setShop(s);
    localStorage.setItem(SHOP_KEY, s.id);
  }, []);

  const hasCapability = useCallback(
    (cap: string) => shop?.capabilities.includes(cap) ?? false,
    [shop],
  );

  const value = useMemo<AuthState>(
    () => ({ user, shops, shop, loading, ready: !loading, login, register, logout, refreshMe, selectShop, hasCapability }),
    [user, shops, shop, loading, login, register, logout, refreshMe, selectShop, hasCapability],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
