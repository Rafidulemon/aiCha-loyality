'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Lock } from 'lucide-react';
import { OtpInput } from '@/components/otp-input';
import { Button, Card, Field, Notice, inputClass } from '@/components/ui';
import { api } from '@/lib/api/client';
import { errorText } from '@/lib/api/messages';
import { safeNext, useSession } from '@/lib/api/session';
import { normalizePhone } from '@/lib/domain/phone';
import { useI18n, type Text } from '@/lib/i18n';
import { mutate } from 'swr';

/** Which sign-in page this is: the cashier one lets any staff member in, the management one only managers and owners. */
export type Area = 'cashier' | 'admin';

type Step = { kind: 'pin' } | { kind: 'code'; challengeId: string; mode: 'sms' | 'fixed' };

/** Where each role starts: the counter for a cashier, the dashboard for management. */
const HOME: Record<string, string> = { cashier: '/cashier', manager: '/admin', owner: '/admin' };

function StaffLogin({ area }: { area: Area }) {
  const { tx, l, n } = useI18n();
  const router = useRouter();
  const next = useSearchParams().get('next');
  const { staff, loading, refresh } = useSession();
  const [step, setStep] = useState<Step>({ kind: 'pin' });
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState<Text | null>(null);
  const [busy, setBusy] = useState(false);

  // Already signed in: go to where this person works.
  useEffect(() => {
    if (!loading && staff) router.replace(safeNext(next, HOME[staff.role] ?? '/cashier'));
  }, [loading, staff, next, router]);

  const finish = async () => {
    const session = await refresh();
    await mutate(() => true, undefined, { revalidate: false });
    router.replace(safeNext(next, HOME[session?.staff?.role ?? 'cashier'] ?? '/cashier'));
  };

  const submitPin = async () => {
    const normalized = normalizePhone(phone);
    if (!normalized) return setError({ bn: 'সঠিক মোবাইল নম্বর দিন', en: 'Enter a valid mobile number' });
    if (!/^\d{6}$/.test(pin)) return setError({ bn: 'PIN হলো ৬টি সংখ্যা', en: 'The PIN is 6 digits' });
    setBusy(true);
    setError(null);
    try {
      const r = await api.post<{ status: 'ok' } | { status: 'otp_required'; challengeId: string; mode: 'sms' | 'fixed' }>('/api/auth/staff/login', { phone: normalized, pin, area });
      if (r.status === 'otp_required') {
        setStep({ kind: 'code', challengeId: r.challengeId, mode: r.mode });
        setCode(['', '', '', '', '', '']);
        setBusy(false);
      } else {
        await finish();
      }
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  };

  // Runs by itself when the sixth digit goes in; the Verify button is the fallback.
  const submitCode = async (typed?: string) => {
    if (step.kind !== 'code' || busy) return;
    const entered = typed ?? code.join('');
    if (entered.length !== 6) return setError({ bn: '৬ সংখ্যার কোডটি পুরো লিখুন', en: 'Enter all 6 digits of the code' });
    setBusy(true);
    setError(null);
    try {
      await api.post('/api/auth/staff/otp', { challengeId: step.challengeId, code: entered });
      await finish();
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[460px] flex-1 flex-col justify-center gap-5 py-6">
      <div>
        <h1 className="font-display text-[clamp(28px,4vw,38px)] font-bold leading-tight">{area === 'admin' ? tx('ম্যানেজমেন্ট লগইন', 'Management sign-in') : tx('ক্যাশিয়ার লগইন', 'Cashier sign-in')}</h1>
        <p className="mt-2 text-muted">{area === 'admin' ? tx('ম্যানেজার ও মালিকদের জন্য', 'For managers and owners') : tx('কাউন্টারে কাজ করা স্টাফদের জন্য', 'For the staff who work the counter')}</p>
      </div>

      <Card className="flex flex-col gap-5">
        {step.kind === 'pin' ? (
          <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); void submitPin(); }}>
            <Field id="staff-phone" label={tx('মোবাইল নম্বর', 'Mobile number')}>
              <div className="flex h-14 overflow-hidden rounded-2xl border-[1.5px] border-line2 bg-surface focus-within:border-brand">
                <span className="flex items-center border-r border-line bg-surface2 px-3.5 text-[17px] font-bold">+880</span>
                <input id="staff-phone" type="tel" inputMode="numeric" autoComplete="username" placeholder="1712-345678" value={phone} onChange={(e) => { setPhone(e.target.value); setError(null); }} className="min-w-0 flex-1 bg-transparent px-3.5 text-lg outline-none" />
              </div>
            </Field>
            <Field id="staff-pin" label={tx('৬ সংখ্যার PIN', '6-digit PIN')} error={error ? l(error) : undefined}>
              <input id="staff-pin" type="password" inputMode="numeric" autoComplete="current-password" maxLength={6} placeholder="••••••" value={pin} onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setError(null); }} className={`${inputClass} h-14 text-center font-mono text-2xl tracking-[0.4em]`} />
            </Field>
            <Link href={`/auth/${area}/forgot-password`} className="-mt-1 self-end text-sm font-bold text-brand-ink underline underline-offset-4">{tx('PIN ভুলে গেছেন?', 'Forgot your PIN?')}</Link>
            <Button type="submit" size="lg" disabled={busy}>
              <Lock size={18} aria-hidden="true" />
              {busy ? tx('যাচাই হচ্ছে…', 'Checking…') : tx('লগইন', 'Sign in')}
            </Button>
          </form>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); void submitCode(); }}>
            <button type="button" onClick={() => { setStep({ kind: 'pin' }); setError(null); }} aria-label={tx('পেছনে যান', 'Go back')} className="flex size-11 items-center justify-center rounded-full border border-line bg-surface">
              <ArrowLeft size={20} aria-hidden="true" />
            </button>
            <div>
              <h2 className="font-display text-2xl font-bold">{tx('কোডটি লিখুন', 'Enter the code')}</h2>
              <p className="mt-1 text-muted">{tx(`+880 ${n(phone)} নম্বরে পাঠানো ৬ সংখ্যার কোড। ম্যানেজার ও মালিকদের দুই ধাপে লগইন করতে হয়।`, `We sent a 6-digit code to +880 ${phone}. Managers and owners sign in in two steps.`)}</p>
            </div>
            {process.env.NODE_ENV !== 'production' && step.mode === 'fixed' && <Notice tone="warn">{tx('ডেভেলপমেন্ট মোড: কোনো SMS যায়নি। .env.local ফাইলের DEV_OTP_CODE কোডটি লিখুন।', 'Development mode: no SMS was sent. Enter the DEV_OTP_CODE from your .env.local file.')}</Notice>}
            <OtpInput value={code} onChange={(v) => { setCode(v); setError(null); }} onComplete={(c) => void submitCode(c)} checking={busy} disabled={busy} error={error ? l(error) : undefined} />
            <Button type="submit" size="lg" disabled={busy}>{busy ? tx('যাচাই হচ্ছে…', 'Checking…') : tx('যাচাই করুন', 'Verify')}</Button>
          </form>
        )}
      </Card>
    </div>
  );
}

export function StaffLoginForm({ area }: { area: Area }) {
  return (
    <Suspense>
      <StaffLogin area={area} />
    </Suspense>
  );
}
