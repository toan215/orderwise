'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { AuthShell, AuthCard } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth';
import { useLocale } from '@/lib/locale';

export default function RegisterPage() {
  const { t } = useLocale();
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ fullName: '', email: '', password: '', phone: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await register(form);
      router.replace('/dashboard');
    } catch {
      setError('Registration failed — please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <AuthCard title={t('auth.register')}>
        <form onSubmit={onSubmit} className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {(
            [
              ['fullName', t('auth.fullName'), 'text'],
              ['email', t('auth.email'), 'email'],
              ['phone', t('auth.phone'), 'tel'],
              ['password', t('auth.password'), 'password'],
            ] as const
          ).map(([key, label, type]) => (
            <div key={key} className="space-y-2">
              <label className="text-sm font-medium">{label}</label>
              <Input
                type={type}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                required={key !== 'phone'}
                autoComplete={key === 'password' ? 'new-password' : 'off'}
              />
            </div>
          ))}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? '…' : t('auth.register')}
          </Button>
        </form>
      </AuthCard>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        {t('auth.haveAccount')}{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          {t('auth.login')}
        </Link>
      </p>
    </AuthShell>
  );
}
