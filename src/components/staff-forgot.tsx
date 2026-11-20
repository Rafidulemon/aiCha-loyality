'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, KeyRound, MessageSquareText, Smartphone } from 'lucide-react';
import { OtpInput } from '@/components/otp-input';
import { Button, Card, Field, Notice, inputClass } from '@/components/ui';
import { normalizePhone } from '@/lib/domain/phone';
import { useI18n, type Text } from '@/lib/i18n';
import { cn } from '@/lib/cn';

type Step = 'phone' | 'code' | 'pin' | 'done';
const STEPS: Step[] = ['phone', 'code', 'pin'];

/**
 * Forgot PIN, for cashiers (/auth/cashier/forgot-password) and management (/auth/admin/forgot-password). DESIGN ONLY: nothing is sent and no PIN changes yet. The screens walk through
 * the flow (number, one-time code, new PIN, done) so the real endpoints can be wired in later.
 */
export function StaffForgot({ area }: { area: 'cashier' | 'admin' }) {
  const { tx, l, n } = useI18n();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [pin, setPin] = useState('');
  const [again, setAgain] = useState('');
  const [error, setError] = useState<Text | null>(null);

  const sendCode = () => {
    if (!normalizePhone(phone)) return setError({ bn: 'সঠিক মোবাইল নম্বর দিন', en: 'Enter a valid mobile number' });
    setError(null);
    setCode(['', '', '', '', '', '']);
    setStep('code');
  };
  const checkCode = (typed?: string) => {
    const entered = typed ?? code.join('');
    if (entered.length !== 6) return setError({ bn: '৬ সংখ্যার কোডটি পুরো লিখুন', en: 'Enter all 6 digits of the code' });
    setError(null);
    setStep('pin');
  };
  const savePin = () => {
    if (!/^\d{6}$/.test(pin)) return setError({ bn: 'PIN হলো ৬টি সংখ্যা', en: 'The PIN is 6 digits' });
    if (pin !== again) return setError({ bn: 'দুটি PIN মেলেনি', en: 'The two PINs do not match' });
    setError(null);
    setStep('done');
  };

  const index = STEPS.indexOf(step);
  const back = () => {
    setError(null);
    setStep(step === 'pin' ? 'code' : 'phone');
  };

  return (
    <div className="mx-auto flex w-full max-w-[460px] flex-1 flex-col justify-center gap-5 py-6">
      <Notice tone="warn">{tx('ডিজাইন প্রিভিউ: এখনো কোনো কোড পাঠানো হয় না এবং PIN বদলায় না।', 'Design preview: no code is sent and no PIN is changed yet.')}</Notice>

      {step !== 'done' && (
        <ol aria-label={tx('ধাপ', 'Steps')} className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <li key={s} className={cn('h-1.5 flex-1 rounded-full transition-colors', i <= index ? 'bg-brand' : 'bg-line2')} aria-current={i === index ? 'step' : undefined} />
          ))}
        </ol>
      )}

      <Card className="flex flex-col gap-5">
        {step === 'phone' && (
          <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); sendCode(); }}>
            <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-brand-ink"><Smartphone size={24} aria-hidden="true" /></span>
            <div>
              <h1 className="font-display text-[clamp(26px,4vw,34px)] font-bold leading-tight">{tx('PIN ভুলে গেছেন?', 'Forgot your PIN?')}</h1>
              <p className="mt-2 text-muted">{tx('আপনার মোবাইল নম্বর দিন। আমরা একটি ৬ সংখ্যার কোড পাঠাব।', 'Enter your mobile number and we will send a 6-digit code.')}</p>
            </div>
            <Field id="forgot-phone" label={tx('মোবাইল নম্বর', 'Mobile number')} error={error ? l(error) : undefined}>
              <div className="flex h-14 overflow-hidden rounded-2xl border-[1.5px] border-line2 bg-surface focus-within:border-brand">
                <span className="flex items-center border-r border-line bg-surface2 px-3.5 text-[17px] font-bold">+880</span>
                <input id="forgot-phone" type="tel" inputMode="numeric" autoComplete="username" placeholder="1712-345678" value={phone} onChange={(e) => { setPhone(e.target.value); setError(null); }} className="min-w-0 flex-1 bg-transparent px-3.5 text-lg outline-none" />
              </div>
            </Field>
            <Button type="submit" size="lg"><MessageSquareText size={18} aria-hidden="true" />{tx('কোড পাঠান', 'Send code')}</Button>
          </form>
        )}

        {step === 'code' && (
          <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); checkCode(); }}>
            <button type="button" onClick={back} aria-label={tx('পেছনে যান', 'Go back')} className="flex size-11 items-center justify-center rounded-full border border-line bg-surface">
              <ArrowLeft size={20} aria-hidden="true" />
            </button>
            <div>
              <h1 className="font-display text-[clamp(26px,4vw,34px)] font-bold leading-tight">{tx('কোডটি লিখুন', 'Enter the code')}</h1>
              <p className="mt-2 text-muted">{tx(`+880 ${n(phone)} নম্বরে পাঠানো ৬ সংখ্যার কোড`, `Sent to +880 ${phone}`)}</p>
            </div>
            <OtpInput value={code} onChange={(v) => { setCode(v); setError(null); }} onComplete={checkCode} error={error ? l(error) : undefined} />
            <p className="text-[15px] text-muted">{tx('কোড পাননি? ০:৩০ পরে আবার পাঠাতে পারবেন', 'Did not get it? Resend in 0:30')}</p>
            <Button type="submit" size="lg">{tx('যাচাই করুন', 'Verify')}</Button>
          </form>
        )}

        {step === 'pin' && (
          <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); savePin(); }}>
            <button type="button" onClick={back} aria-label={tx('পেছনে যান', 'Go back')} className="flex size-11 items-center justify-center rounded-full border border-line bg-surface">
              <ArrowLeft size={20} aria-hidden="true" />
            </button>
            <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-brand-ink"><KeyRound size={24} aria-hidden="true" /></span>
            <div>
              <h1 className="font-display text-[clamp(26px,4vw,34px)] font-bold leading-tight">{tx('নতুন PIN দিন', 'Set a new PIN')}</h1>
              <p className="mt-2 text-muted">{tx('৬টি সংখ্যার একটি PIN বেছে নিন। অন্য কাউকে বলবেন না।', 'Choose a 6-digit PIN. Do not share it with anyone.')}</p>
            </div>
            <Field id="new-pin" label={tx('নতুন PIN', 'New PIN')}>
              <input id="new-pin" type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} placeholder="••••••" value={pin} onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setError(null); }} className={`${inputClass} h-14 text-center font-mono text-2xl tracking-[0.4em]`} />
            </Field>
            <Field id="again-pin" label={tx('PIN আবার লিখুন', 'Repeat the PIN')} error={error ? l(error) : undefined}>
              <input id="again-pin" type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} placeholder="••••••" value={again} onChange={(e) => { setAgain(e.target.value.replace(/\D/g, '')); setError(null); }} className={`${inputClass} h-14 text-center font-mono text-2xl tracking-[0.4em]`} />
            </Field>
            <Button type="submit" size="lg">{tx('PIN সেভ করুন', 'Save PIN')}</Button>
          </form>
        )}

        {step === 'done' && (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--ok)_14%,transparent)] text-ok"><CheckCircle2 size={36} aria-hidden="true" /></span>
            <div>
              <h1 className="font-display text-[clamp(26px,4vw,34px)] font-bold leading-tight">{tx('PIN বদলানো হয়েছে', 'PIN changed')}</h1>
              <p className="mt-2 text-muted">{tx('এখন নতুন PIN দিয়ে লগইন করুন।', 'You can now sign in with your new PIN.')}</p>
            </div>
          </div>
        )}
      </Card>

      <Link href={`/auth/${area}/login`} className="text-center text-[15px] font-bold underline underline-offset-4">
        {step === 'done' ? tx('লগইনে যান', 'Go to sign-in') : tx('লগইনে ফিরে যান', 'Back to sign-in')}
      </Link>
    </div>
  );
}
