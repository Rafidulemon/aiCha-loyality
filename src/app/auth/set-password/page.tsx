'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound } from 'lucide-react';
import { mutate } from 'swr';
import { NewPasswordForm } from '@/components/new-password-form';
import { Card } from '@/components/ui';
import { api } from '@/lib/api/client';
import { useSession } from '@/lib/api/session';
import { useI18n } from '@/lib/i18n';

/**
 * The step right after the first sign-in with the one-time password: the customer chooses their own password. From then on they
 * sign in with it. A customer who already has one is sent on to the card.
 */
export default function SetPasswordPage() {
  const { tx } = useI18n();
  const router = useRouter();
  const { customer, loading } = useSession();

  useEffect(() => {
    if (loading) return;
    if (!customer) router.replace('/auth/login');
    else if (customer.passwordSet) router.replace(customer.profileComplete ? '/cards' : '/setup');
  }, [loading, customer, router]);

  if (!customer || customer.passwordSet) return <div role="status" aria-label={tx('লোড হচ্ছে', 'Loading')} className="mx-auto mt-10 h-64 w-full max-w-[460px] animate-pulse rounded-card bg-surface2" />;

  const save = async (password: string) => {
    await api.post('/api/me/password', { password });
    await mutate('/api/auth/session');
    router.replace(customer.profileComplete ? '/cards' : '/setup');
  };

  return (
    <div className="mx-auto flex w-full max-w-[460px] flex-1 flex-col justify-center gap-5 py-6">
      <Card className="flex flex-col gap-5">
        <NewPasswordForm phone={customer.phone} onSubmit={save} submitLabel={{ bn: 'পাসওয়ার্ড সেভ করুন', en: 'Save password' }}>
          <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-brand-ink"><KeyRound size={24} aria-hidden="true" /></span>
          <div>
            <h1 className="font-display text-[clamp(26px,4vw,34px)] font-bold leading-tight">{tx('নিজের পাসওয়ার্ড বেছে নিন', 'Choose your own password')}</h1>
            <p className="mt-2 text-muted">{tx('এখন থেকে এই পাসওয়ার্ড দিয়েই লগইন করবেন। ওয়ান-টাইম পাসওয়ার্ড আর কাজ করবে না।', 'You will sign in with this from now on. The one-time password will stop working.')}</p>
          </div>
        </NewPasswordForm>
      </Card>
    </div>
  );
}
