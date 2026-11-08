import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format VND / generic currency. Input is a number or numeric string. */
export function formatMoney(value: number | string | null | undefined, currency = 'VND'): string {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return '—';
  try {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'VND' ? 0 : 2,
    }).format(n);
  } catch {
    return `${n.toLocaleString('vi-VN')} ${currency}`;
  }
}
