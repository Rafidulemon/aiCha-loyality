'use client';

import useSWR from 'swr';
import type { MeDto, StaffMeDto } from '@/lib/contracts/dto';
import { disablePush } from '../push';
import { api } from './client';

/**
 * Who is signed in on this browser: a customer, staff, both or neither. Loading until the first answer. `error` is set when
 * the question itself failed (no connection, server down): that is not the same as being signed out, so screens should
 * offer a retry instead of sending the person to sign in.
 */
export function useSession() {
  const { data, error, isLoading, mutate } = useSWR<{ customer: MeDto | null; staff: StaffMeDto | null }>('/api/auth/session', { revalidateOnFocus: false });
  return { customer: data?.customer ?? null, staff: data?.staff ?? null, loading: isLoading, error, refresh: mutate };
}

/** The sign-in screen of the app a path belongs to: /admin has its own, /cashier has its own, everything else is the customer app. */
export function signInPathFor(path: string): string {
  if (path === '/admin' || path.startsWith('/admin/')) return '/auth/admin/login';
  if (path === '/cashier' || path.startsWith('/cashier/')) return '/auth/cashier/login';
  return '/auth/login';
}

/** Signs out and goes to the right sign-in screen. `everywhere` also ends every other device's session (MG-21). */
export async function signOut(scope: 'customer' | 'staff', everywhere = false) {
  const from = window.location.pathname;
  try {
    // This browser stops getting this person's notifications before the session ends (it needs the session to say so).
    if (scope === 'customer') await disablePush().catch(() => undefined);
    await api.post('/api/auth/logout', { scope, everywhere });
  } finally {
    window.location.assign(scope === 'customer' ? '/auth/login' : signInPathFor(from));
  }
}

/** Only follow a "?next=" that stays on this site, so a crafted link cannot send someone elsewhere after they sign in. */
export function safeNext(next: string | null | undefined, fallback: string): string {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.includes('\\') ? next : fallback;
}
