'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { OtpInput } from '@/components/otp-input';
import { Notice } from '@/components/ui';
import { api, isApiError } from '@/lib/api/client';
import { errorText, retryAfter } from '@/lib/api/messages';
import { formatPhone } from '@/lib/domain/phone';
import { useI18n, type Text } from '@/lib/i18n';

/**
 * Registering a customer, the "prove the number" step. It sends a 6-digit code to the customer's phone (as soon as it appears), and
 * the staff member types in what the customer reads out. The moment the sixth digit is in, `onVerified` runs with the code, and it
 * does the actual registration. A wrong code turns the boxes red; so does any other refusal (the text says which).
 *
 * `requestUrl` is the staff API that sends the code: /api/cashier/customers/code or /api/admin/customers/code.
 */
export function CustomerVerify({ phone, requestUrl, onVerified, onBack }: { phone: string; requestUrl: string; onVerified: (challengeId: string, code: string) => Promise<void>; onBack: () => void }) {
  const { tx, l, n } = useI18n();
  const [challenge, setChallenge] = useState<{ challengeId: string; resendAt: number; mode: 'sms' | 'fixed' } | null>(null);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState<Text | null>(null);
  const [sendError, setSendError] = useState<Text | null>(null);
  const [sending, setSending] = useState(true);
  const [checking, setChecking] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const asked = useRef(false);

  const send = async () => {
    setSending(true);
    setSendError(null);
    setError(null);
    try {
      const r = await api.post<{ challengeId: string; resendAfterSec: number; mode: 'sms' | 'fixed' }>(requestUrl, { phone });
      setChallenge({ challengeId: r.challengeId, resendAt: Date.now() + r.resendAfterSec * 1000, mode: r.mode });
      setNow(Date.now());
      setCode(['', '', '', '', '', '']);
    } catch (e) {
      const seconds = retryAfter(e);
      setSendError(seconds ? { bn: `${errorText(e).bn} (${n(seconds)} সেকেন্ড)`, en: `${errorText(e).en} (${seconds}s)` } : errorText(e));
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (asked.current) return;
    asked.current = true;
    void send();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!challenge) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [challenge]);

  const wait = challenge ? Math.max(0, Math.ceil((challenge.resendAt - now) / 1000)) : 0;

  const verify = async (typed?: string) => {
    if (!challenge || checking) return;
    const entered = typed ?? code.join('');
    if (entered.length !== 6) return setError({ bn: '৬ সংখ্যার কোডটি পুরো লিখুন', en: 'Enter all 6 digits of the code' });
    setChecking(true);
    setError(null);
    try {
      await onVerified(challenge.challengeId, entered);
    } catch (e) {
      setError(isApiError(e) && e.code === 'OTP_INVALID' ? { bn: 'কোডটি ঠিক নয় বা মেয়াদ শেষ।', en: 'That code is not right or has expired.' } : errorText(e));
      setChecking(false);
    }
  };

  const back = (
    <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-full border border-line bg-surface px-3.5 text-sm font-bold">
      <ArrowLeft size={16} aria-hidden="true" />
      {tx('নম্বর বদলান', 'Change the number')}
    </button>
  );

  if (sendError) {
    return (
      <div className="flex flex-col gap-3">
        <Notice tone="danger">{l(sendError)}</Notice>
        <div className="flex flex-wrap gap-2.5">
          {back}
          <button type="button" onClick={() => void send()} className="inline-flex min-h-11 items-center rounded-full bg-brand-soft px-4 text-sm font-bold text-brand-ink">{tx('আবার চেষ্টা করুন', 'Try again')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3" aria-busy={sending}>
      <div>
        <p className="font-bold">{tx('গ্রাহকের ফোনে কোড পাঠানো হয়েছে', 'A code was sent to the customer’s phone')}</p>
        <p className="text-sm text-muted">{tx(`${formatPhone(phone)} নম্বরে। গ্রাহক কোডটি বললে এখানে লিখুন।`, `To ${formatPhone(phone)}. Type in the code the customer reads out.`)}</p>
      </div>
      {process.env.NODE_ENV !== 'production' && challenge?.mode === 'fixed' && (
        <Notice tone="warn">{tx('ডেভেলপমেন্ট মোড: কোনো SMS যায়নি। DEV_OTP_CODE কোডটি লিখুন।', 'Development mode: no SMS was sent. Enter the DEV_OTP_CODE.')}</Notice>
      )}
      {sending && !challenge ? (
        <div role="status" aria-label={tx('কোড পাঠানো হচ্ছে', 'Sending the code')} className="h-14 animate-pulse rounded-[14px] bg-surface2" />
      ) : (
        <OtpInput value={code} onChange={(v) => { setCode(v); setError(null); }} onComplete={(c) => void verify(c)} checking={checking} disabled={checking} error={error ? l(error) : undefined} />
      )}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm text-muted">
        {back}
        {wait > 0 ? (
          <span>{tx(`আবার পাঠাতে ০:${n(String(wait).padStart(2, '0'))}`, `Resend in 0:${String(wait).padStart(2, '0')}`)}</span>
        ) : (
          <button type="button" onClick={() => void send()} disabled={sending || checking} className="font-bold text-ink underline underline-offset-4">{tx('আবার কোড পাঠান', 'Send the code again')}</button>
        )}
      </div>
      <p className="text-[13px] text-muted">{tx('নতুন গ্রাহক তাঁর লয়্যালটি ID ও ওয়ান-টাইম পাসওয়ার্ড SMS-এ পাবেন, তারপর নিজের পাসওয়ার্ড দেবেন।', 'The customer then gets their loyalty ID and a one-time password by SMS, and chooses their own password.')}</p>
    </div>
  );
}
