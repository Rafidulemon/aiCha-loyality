'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Field } from '@/components/ui';
import { Mascot } from '@/components/brand';
import { PasswordField } from '@/components/password-field';
import { api, isApiError } from '@/lib/api/client';
import { errorText } from '@/lib/api/messages';
import { safeNext, useSession } from '@/lib/api/session';
import { normalizePhone } from '@/lib/domain/phone';
import { useI18n, type Text } from '@/lib/i18n';
import { cn } from '@/lib/cn';

function HeroArt() {
  return (
    <div aria-hidden="true" className="relative min-h-[230px] flex-1 basis-[320px] overflow-hidden rounded-hero bg-[#E6012C]">
      <span className="absolute -bottom-12 -right-10 size-56 rounded-full bg-white/90" />
      <span className="absolute -left-6 -top-10 size-[120px] rounded-full bg-tangerine" />
      <MiniCard className="left-[6%] top-[14%] w-[48%] -rotate-[8deg] bg-white" ink="#E6012C" filled={3} />
      <MiniCard className="bottom-[10%] left-[10%] w-[44%] rotate-[6deg] bg-tangerine" ink="#171717" filled={2} />
      <Mascot size={230} className="absolute bottom-3 right-[4%] h-[78%] min-h-[170px] w-auto drop-shadow-[0_10px_14px_rgba(0,0,0,0.25)]" />
    </div>
  );
}
function MiniCard({ className, ink, filled }: { className: string; ink: string; filled: number }) {
  return (
    <div className={cn('absolute flex max-w-[260px] aspect-[1.6] flex-col justify-between rounded-[20px] p-3.5 shadow-[0_12px_28px_rgba(11,26,31,0.3)]', className)}>
      <span className="h-2.5 w-[46%] rounded-full" style={{ background: ink }} />
      <div className="grid grid-cols-4 gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="aspect-square rounded-full" style={i < filled ? { background: ink } : { border: `2px dashed ${ink}`, opacity: 0.5 }} />
        ))}
      </div>
    </div>
  );
}

function LoginForm() {
  const { tx, l } = useI18n();
  const router = useRouter();
  const next = useSearchParams().get('next');
  const { customer, loading } = useSession();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<Text | null>(null);
  const [busy, setBusy] = useState(false);

  // Already signed in on this phone: go straight to the card (or to the step they still owe: a password, then a name).
  useEffect(() => {
    if (loading || !customer) return;
    router.replace(!customer.passwordSet ? '/auth/set-password' : safeNext(next, customer.profileComplete ? '/cards' : '/setup'));
  }, [loading, customer, next, router]);

  const normalized = normalizePhone(phone);

  const signIn = async () => {
    if (!normalized) return setError({ bn: 'সঠিক মোবাইল নম্বর দিন, যেমন 1712-345678', en: 'Enter a valid mobile number, like 1712-345678' });
    if (!password) return setError({ bn: 'পাসওয়ার্ড লিখুন', en: 'Enter your password' });
    setBusy(true);
    setError(null);
    try {
      const r = await api.post<{ passwordSet: boolean; profileComplete: boolean }>('/api/auth/login', { phone: normalized, password });
      router.push(!r.passwordSet ? '/auth/set-password' : r.profileComplete ? safeNext(next, '/cards') : '/setup');
    } catch (e) {
      if (isApiError(e) && e.code === 'INVALID_CREDENTIALS') setError({ bn: 'মোবাইল নম্বর বা পাসওয়ার্ড ঠিক নয়।', en: 'The mobile number or password is not right.' });
      else if (isApiError(e) && e.code === 'ACCOUNT_LOCKED') setError({ bn: 'অনেকবার ভুল পাসওয়ার্ড দেওয়া হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন, অথবা পাসওয়ার্ড রিসেট করুন।', en: 'Too many wrong passwords. Try again in a little while, or reset your password.' });
      else setError(errorText(e));
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-1 flex-wrap items-stretch gap-[clamp(20px,4vw,48px)] pt-1">
      <HeroArt />
      <div className="flex flex-1 basis-[340px] flex-col justify-center gap-6">
        <form className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); void signIn(); }}>
          <div>
            <h1 className="font-display text-[clamp(28px,4vw,40px)] font-bold leading-tight">{tx('আপনার আইচা কার্ড, সবসময় সাথে', 'Your AiCha card, always with you')}</h1>
            <p className="mt-2 text-base text-muted">{tx('মোবাইল নম্বর ও পাসওয়ার্ড দিয়ে লগইন করুন।', 'Sign in with your mobile number and password.')}</p>
          </div>
          <Field id="phone" label={tx('মোবাইল নম্বর', 'Mobile number')}>
            <div className="flex h-14 overflow-hidden rounded-2xl border-[1.5px] border-line2 bg-surface focus-within:border-brand">
              <span className="flex items-center border-r border-line bg-surface2 px-3.5 text-[17px] font-bold">+880</span>
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="username"
                placeholder="1712-345678"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setError(null); }}
                className="min-w-0 flex-1 bg-transparent px-3.5 text-lg outline-none"
              />
            </div>
          </Field>
          <Field id="password" label={tx('পাসওয়ার্ড', 'Password')} error={error ? l(error) : undefined}>
            <PasswordField id="password" value={password} onChange={(v) => { setPassword(v); setError(null); }} autoComplete="current-password" invalid={!!error} />
          </Field>
          <div className="-mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <p className="text-[13px] text-muted">{tx('প্রথমবার? আপনাকে পাঠানো ওয়ান-টাইম পাসওয়ার্ড দিন।', 'First time? Use the one-time password we sent you.')}</p>
            <Link href="/auth/forgot-password" className="text-sm font-bold text-brand-ink underline underline-offset-4">{tx('পাসওয়ার্ড ভুলে গেছেন?', 'Forgot password?')}</Link>
          </div>
          <Button type="submit" size="lg" disabled={busy}>{busy ? tx('লগইন হচ্ছে…', 'Signing in…') : tx('লগইন', 'Sign in')}</Button>
          <p className="text-center text-[13px] text-muted">
            {tx('নতুন কার্ড লাগলে আইচা ধানমন্ডির কাউন্টারে বলুন।', 'Need a card? Ask at the AiCha Dhanmondi counter.')}
          </p>
          <p className="text-center text-[13px] text-muted">
            {tx('চালিয়ে গেলে আপনি আমাদের ', 'By continuing you agree to our ')}
            <Link href="/terms" className="font-semibold underline underline-offset-2">{tx('শর্তাবলী', 'Terms')}</Link>
            {tx(' ও ', ' and ')}
            <Link href="/privacy" className="font-semibold underline underline-offset-2">{tx('প্রাইভেসি পলিসি', 'Privacy policy')}</Link>
            {tx('-তে সম্মত হচ্ছেন', '.')}
          </p>
        </form>
      </div>
    </div>
  );
}

// useSearchParams needs a Suspense boundary so the page can still be built.
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
