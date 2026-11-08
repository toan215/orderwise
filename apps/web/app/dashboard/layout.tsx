'use client';
import { useEffect } from 'react';
import { redirect, usePathname } from 'next/navigation';
import { FullPageLoader } from '@/components/full-page-loader';
import { Sidebar } from '@/components/sidebar';
import { useAuth } from '@/lib/auth';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, shop, ready } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    if (ready && !user) redirect('/login');
  }, [ready, user]);

  if (!ready || !user) return <FullPageLoader />;
  if (!shop) {
    // Logged in but no shop membership yet — show setup prompt inside the shell.
    return (
      <div className="flex min-h-screen">
        <Sidebar pathname={pathname} />
        <main className="flex flex-1 flex-col gap-4 p-6 md:p-8">
          <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
            Bạn chưa thuộc cửa hàng nào. Tạo hoặc được thêm vào một cửa hàng trong cài đặt để bắt đầu.
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar pathname={pathname} />
      <main className="flex-1 overflow-x-hidden p-6 md:p-8">{children}</main>
    </div>
  );
}
