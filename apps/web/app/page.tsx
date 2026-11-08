'use client';
import { useEffect } from 'react';
import { redirect } from 'next/navigation';
import { FullPageLoader } from '@/components/full-page-loader';
import { useAuth } from '@/lib/auth';

export default function IndexPage() {
  const { user, ready } = useAuth();
  useEffect(() => {
    if (ready && user) redirect('/dashboard');
    if (ready && !user) redirect('/login');
  }, [ready, user]);
  return <FullPageLoader message="Orderwise" />;
}
