'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, CreditCard, Gift, Tag, User } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { BrandLogo } from './brand';
import { OfferBar } from './offer-bar';
import { Toggles } from './toggles';
import { WalletEvents } from './wallet-events';
import { useNotifications } from '@/lib/api/notifications';
import { useI18n } from '@/lib/i18n';
import { dropForeignSubscription } from '@/lib/push';
import { useWallet } from '@/lib/wallet';
import { cn } from '@/lib/cn';

const NAV = [
  { href: '/cards', bn: 'কার্ড', en: 'Card', Icon: CreditCard },
  { href: '/rewards', bn: 'Reward', en: 'Rewards', Icon: Gift },
  { href: '/offers', bn: 'অফার', en: 'Offers', Icon: Tag },
  { href: '/profile', bn: 'প্রোফাইল', en: 'Profile', Icon: User },
];

export function CustomerShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { tx, n } = useI18n();
  const { ready, me, readyVouchers, unclaimed } = useWallet();
  const { unread } = useNotifications();
  // The first sign-in uses a one-time password; until the customer has chosen their own, nothing else opens.
  const router = useRouter();
  useEffect(() => {
    if (ready && me && !me.passwordSet) router.replace('/auth/set-password');
  }, [ready, me, router]);
  // A phone shared between people: notifications someone else turned on for this browser must not show this person's stamps.
  useEffect(() => {
    if (me?.id) void dropForeignSubscription(me.id).catch(() => undefined);
  }, [me?.id]);
  // Kept here, not in the bar, so hiding it survives visiting the Offers page where the bar is not shown.
  const [barHidden, setBarHidden] = useState(false);
  const isActive = (href: string) => path === href || path.startsWith(href + '/');
  /** Small count bubbles: rewards ready to use and offers not claimed yet. */
  const counts: Record<string, number> = { '/rewards': readyVouchers.length, '/offers': unclaimed };

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-line/70 bg-bg/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1120px] items-center justify-between gap-3 px-4 py-3 md:px-10">
          <BrandLogo href="/cards" />
          <nav aria-label={tx('প্রধান মেনু', 'Main menu')} className="hidden gap-1 md:flex">
            {NAV.map((item) => {
              const count = counts[item.href] ?? 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                  className={cn('flex min-h-11 items-center gap-2 rounded-full px-4 font-semibold', isActive(item.href) ? 'bg-brand-soft font-bold text-brand-ink shadow-[inset_0_0_0_1px_rgba(230,1,44,0.12)]' : 'text-muted hover:bg-surface2 hover:text-ink')}
                >
                  {tx(item.bn, item.en)}
                  {count > 0 && <span aria-label={tx(`${n(count)}টি নতুন`, `${count} new`)} className="rounded-full bg-rose px-1.5 text-[12px] font-extrabold leading-[18px] text-[#171717]">{n(count)}</span>}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <Toggles />
            <Link href="/notifications" aria-label={tx('নোটিফিকেশন', 'Notifications')} className="relative flex size-11 items-center justify-center rounded-full border border-line bg-surface shadow-soft hover:bg-surface2">
              <Bell size={20} aria-hidden="true" />
              {unread > 0 && <span aria-label={tx(`${n(unread)}টি নতুন`, `${unread} new`)} className="absolute right-2.5 top-2.5 size-2.5 rounded-full border-2 border-surface bg-rose" />}
            </Link>
          </div>
        </div>
      </header>

      {ready && !barHidden && path !== '/offers' && <OfferBar onDismiss={() => setBarHidden(true)} />}

      <main className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col gap-[18px] px-4 pb-8 pt-4 md:px-10">
        {ready ? (
          children
        ) : (
          // Wait for the wallet so no screen ever shows an empty card, "0 rewards" or "voucher not found" for a moment.
          <div role="status" aria-label={tx('লোড হচ্ছে', 'Loading')} className="flex flex-col gap-4">
            <div className="h-9 w-48 animate-pulse rounded-xl bg-surface2" />
            <div className="h-[212px] animate-pulse rounded-[26px] bg-surface2" />
            <div className="h-24 animate-pulse rounded-card bg-surface2" />
          </div>
        )}
      </main>

      <nav aria-label={tx('প্রধান মেনু', 'Main menu')} className="sticky bottom-0 z-20 flex border-t border-line/70 bg-surface/90 px-1.5 shadow-[0_-10px_30px_-18px_rgba(32,27,24,0.25)] backdrop-blur-xl pb-[max(14px,env(safe-area-inset-bottom))] pt-2 md:hidden">
        {NAV.map(({ href, bn, en, Icon }) => {
          const on = isActive(href);
          const count = counts[href] ?? 0;
          return (
            <Link key={href} href={href} aria-current={on ? 'page' : undefined} className={cn('flex min-h-11 min-w-0 flex-1 flex-col items-center gap-0.5 pt-1 text-[12px]', on ? 'font-bold text-brand-ink' : 'font-semibold text-muted')}>
              <span className={cn('relative flex rounded-full px-3.5 py-0.5', on && 'bg-brand-soft')}>
                <Icon size={22} aria-hidden="true" />
                {count > 0 && <span aria-label={tx(`${n(count)}টি নতুন`, `${count} new`)} className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-rose px-1 text-center text-[11px] font-extrabold leading-[18px] text-[#171717]">{n(count)}</span>}
              </span>
              <span className="max-w-full truncate">{tx(bn, en)}</span>
            </Link>
          );
        })}
      </nav>
      <WalletEvents />
    </div>
  );
}
