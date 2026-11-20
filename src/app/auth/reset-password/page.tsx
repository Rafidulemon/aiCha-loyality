'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, LockKeyhole } from 'lucide-react';
import { NewPasswordForm } from '@/components/new-password-form';
import { ButtonLink, Card } from '@/components/ui';
import { api, isApiError } from '@/lib/api/client';
import { useI18n } from '@/lib/i18n';
import { RESET_KEY } from '@/lib/reset-token';

/**
 * Reset password, the last step of "Forgot password": the code was already confirmed, so only the new password is asked. When the
 * token is missing or has run out, the person is sent back to start again.
 */
export default function ResetPasswordPage() {
  const { tx } = useI18n();
  const router = useRouter();
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = sessionStorage.getItem(RESET_KEY);
    } catch {
      /* no storage */
    }
    if (!saved) router.replace('/auth/forgot-password');
    setToken(saved);
  }, [router]);

  if (!token && !done) return <div role="status" aria-label={tx('লোড হচ্ছে', 'Loading')} className="mx-auto mt-10 h-64 w-full max-w-[460px] animate-pulse rounded-card bg-surface2" />;

  const save = async (password: string) => {
    try {
      await api.post('/api/auth/password/reset', { resetToken: token, password });
    } catch (e) {
      // The token ran out (10 minutes) or was already used: start again rather than show a dead form.
      if (isApiError(e) && e.code === 'OTP_INVALID') {
        try {
          sessionStorage.removeItem(RESET_KEY);
        } catch {
          /* no storage */
        }
        router.replace('/auth/forgot-password');
        return;
      }
      throw e;
    }
    try {
      sessionStorage.removeItem(RESET_KEY);
    } catch {
      /* no storage */
    }
    setDone(true);
  };

  return (
    <div className="mx-auto flex w-full max-w-[460px] flex-1 flex-col justify-center gap-5 py-6">
      <Card className="flex flex-col gap-5">
        {done ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--ok)_14%,transparent)] text-ok"><CheckCircle2 size={36} aria-hidden="true" /></span>
            <div>
              <h1 className="font-display text-[clamp(26px,4vw,34px)] font-bold leading-tight">{tx('পাসওয়ার্ড বদলানো হয়েছে', 'Password changed')}</h1>
              <p className="mt-2 text-muted">{tx('এখন নতুন পাসওয়ার্ড দিয়ে লগইন করুন।', 'You can now sign in with your new password.')}</p>
            </div>
            <ButtonLink href="/auth/login" size="lg" className="w-full">{tx('লগইনে যান', 'Go to sign-in')}</ButtonLink>
          </div>
        ) : (
          <NewPasswordForm onSubmit={save} submitLabel={{ bn: 'পাসওয়ার্ড সেভ করুন', en: 'Save password' }}>
            <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-brand-ink"><LockKeyhole size={24} aria-hidden="true" /></span>
            <div>
              <h1 className="font-display text-[clamp(26px,4vw,34px)] font-bold leading-tight">{tx('নতুন পাসওয়ার্ড দিন', 'Set a new password')}</h1>
              <p className="mt-2 text-muted">{tx('এটি সব ডিভাইসে আপনাকে লগআউট করে দেবে।', 'This signs you out on every device.')}</p>
            </div>
          </NewPasswordForm>
        )}
      </Card>
      {!done && <Link href="/auth/login" className="text-center text-[15px] font-bold underline underline-offset-4">{tx('লগইনে ফিরে যান', 'Back to sign-in')}</Link>}
    </div>
  );
}
