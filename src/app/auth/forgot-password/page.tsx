'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MessageSquareText, Smartphone } from 'lucide-react';
import { OtpInput } from '@/components/otp-input';
import { Button, Card, Field, Notice } from '@/components/ui';
import { api, isApiError } from '@/lib/api/client';
import { errorText, retryAfter } from '@/lib/api/messages';
import { normalizePhone } from '@/lib/domain/phone';
import { useI18n, type Text } from '@/lib/i18n';
import { RESET_KEY } from '@/lib/reset-token';

type Challenge = { challengeId: string; resendAt: number; mode: 'sms' | 'fixed' };

/**
 * Forgot password (customers): the mobile number, then the 6-digit code sent to it. The code is checked the moment the sixth digit
 * is typed; when it is right the reset token is kept for this tab and the customer chooses a new password on the next screen.
 */
export default function ForgotPasswordPage() {
  const { tx, l, n } = useI18n();
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState<Text | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (step !== 'code') return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [step]);

  const wait = challenge ? Math.max(0, Math.ceil((challenge.resendAt - now) / 1000)) : 0;
  const normalized = normalizePhone(phone);

  const sendCode = async () => {
    if (!normalized) return setError({ bn: 'সঠিক মোবাইল নম্বর দিন, যেমন 1712-345678', en: 'Enter a valid mobile number, like 1712-345678' });
    setBusy(true);
    setError(null);
    try {
      const r = await api.post<{ challengeId: string; resendAfterSec: number; mode: 'sms' | 'fixed' }>('/api/auth/password/forgot', { phone: normalized });
      setChallenge({ challengeId: r.challengeId, resendAt: Date.now() + r.resendAfterSec * 1000, mode: r.mode });
      setNow(Date.now());
      setCode(['', '', '', '', '', '']);
      setStep('code');
    } catch (e) {
      const seconds = retryAfter(e);
      setError(seconds ? { bn: `${errorText(e).bn} (${n(seconds)} সেকেন্ড)`, en: `${errorText(e).en} (${seconds}s)` } : errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const check = async (typed?: string) => {
    if (!challenge || busy) return;
    const entered = typed ?? code.join('');
    if (entered.length !== 6) return setError({ bn: '৬ সংখ্যার কোডটি পুরো লিখুন', en: 'Enter all 6 digits of the code' });
    setBusy(true);
    setError(null);
    try {
      const r = await api.post<{ resetToken: string }>('/api/auth/password/verify', { challengeId: challenge.challengeId, code: entered });
      try {
        sessionStorage.setItem(RESET_KEY, r.resetToken);
      } catch {
        /* private mode without storage: the next screen will ask to start again */
      }
      router.push('/auth/reset-password');
    } catch (e) {
      setError(isApiError(e) && e.code === 'OTP_INVALID' ? { bn: 'কোডটি ঠিক নয় বা মেয়াদ শেষ।', en: 'That code is not right or has expired.' } : errorText(e));
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[460px] flex-1 flex-col justify-center gap-5 py-6">
      <Card className="flex flex-col gap-5">
        {step === 'phone' ? (
          <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); void sendCode(); }}>
            <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-brand-ink"><Smartphone size={24} aria-hidden="true" /></span>
            <div>
              <h1 className="font-display text-[clamp(26px,4vw,34px)] font-bold leading-tight">{tx('পাসওয়ার্ড ভুলে গেছেন?', 'Forgot your password?')}</h1>
              <p className="mt-2 text-muted">{tx('আপনার মোবাইল নম্বর দিন। আমরা একটি ৬ সংখ্যার কোড পাঠাব।', 'Enter your mobile number and we will send a 6-digit code.')}</p>
            </div>
            <Field id="forgot-phone" label={tx('মোবাইল নম্বর', 'Mobile number')} error={error ? l(error) : undefined}>
              <div className="flex h-14 overflow-hidden rounded-2xl border-[1.5px] border-line2 bg-surface focus-within:border-brand">
                <span className="flex items-center border-r border-line bg-surface2 px-3.5 text-[17px] font-bold">+880</span>
                <input id="forgot-phone" type="tel" inputMode="numeric" autoComplete="username" placeholder="1712-345678" value={phone} onChange={(e) => { setPhone(e.target.value); setError(null); }} className="min-w-0 flex-1 bg-transparent px-3.5 text-lg outline-none" />
              </div>
            </Field>
            <Button type="submit" size="lg" disabled={busy}><MessageSquareText size={18} aria-hidden="true" />{busy ? tx('পাঠানো হচ্ছে…', 'Sending…') : tx('কোড পাঠান', 'Send code')}</Button>
          </form>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); void check(); }}>
            <button type="button" onClick={() => { setStep('phone'); setError(null); }} aria-label={tx('পেছনে যান', 'Go back')} className="flex size-11 items-center justify-center rounded-full border border-line bg-surface">
              <ArrowLeft size={20} aria-hidden="true" />
            </button>
            <div>
              <h1 className="font-display text-[clamp(26px,4vw,34px)] font-bold leading-tight">{tx('কোডটি লিখুন', 'Enter the code')}</h1>
              <p className="mt-2 text-muted">{tx(`+880 ${n(phone)} নম্বরে পাঠানো ৬ সংখ্যার কোড`, `Sent to +880 ${phone}`)}</p>
            </div>
            {process.env.NODE_ENV !== 'production' && challenge?.mode === 'fixed' && (
              <Notice tone="warn">{tx('ডেভেলপমেন্ট মোড: কোনো SMS যায়নি। .env.local ফাইলের DEV_OTP_CODE কোডটি লিখুন।', 'Development mode: no SMS was sent. Enter the DEV_OTP_CODE from your .env.local file.')}</Notice>
            )}
            <OtpInput value={code} onChange={(v) => { setCode(v); setError(null); }} onComplete={(c) => void check(c)} checking={busy} disabled={busy} error={error ? l(error) : undefined} />
            <p className="text-[15px] text-muted">
              {wait > 0 ? (
                tx(`কোড পাননি? ০:${n(String(wait).padStart(2, '0'))} পরে আবার পাঠাতে পারবেন`, `Did not get it? Resend in 0:${String(wait).padStart(2, '0')}`)
              ) : (
                <button type="button" onClick={() => void sendCode()} disabled={busy} className="font-bold text-ink underline underline-offset-4">{tx('আবার কোড পাঠান', 'Send the code again')}</button>
              )}
            </p>
            <Button type="submit" size="lg" disabled={busy}>{busy ? tx('যাচাই হচ্ছে…', 'Checking…') : tx('যাচাই করুন', 'Verify')}</Button>
          </form>
        )}
      </Card>
      <Link href="/auth/login" className="text-center text-[15px] font-bold underline underline-offset-4">{tx('লগইনে ফিরে যান', 'Back to sign-in')}</Link>
    </div>
  );
}
