'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { BrandLogo } from '@/components/brand';
import { Toggles } from '@/components/toggles';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/cn';

const TABS = [
  { href: '/help', bn: 'সাহায্য', en: 'Help' },
  { href: '/privacy', bn: 'প্রাইভেসি', en: 'Privacy' },
  { href: '/terms', bn: 'শর্তাবলী', en: 'Terms' },
];

/** Help, Privacy and Terms: public pages (the sign-in screen links to them), with a small tab bar between the three. */
export default function InfoLayout({ children }: { children: ReactNode }) {
  const { tx } = useI18n();
  const path = usePathname();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-line/70 bg-bg/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[860px] items-center justify-between gap-3 px-4 py-3 md:px-8">
          <BrandLogo />
          <Toggles />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-[860px] flex-1 flex-col gap-5 px-4 pb-12 pt-5 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={() => (window.history.length > 1 ? window.history.back() : window.location.assign('/'))} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 text-[15px] font-bold shadow-soft hover:bg-surface2">
            <ArrowLeft size={18} aria-hidden="true" />{tx('পেছনে', 'Back')}
          </button>
          <nav aria-label={tx('তথ্য পাতা', 'Information pages')} className="flex rounded-full border border-line bg-surface2 p-[3px]">
            {TABS.map((tab) => (
              <Link key={tab.href} href={tab.href} replace aria-current={path === tab.href ? 'page' : undefined} className={cn('flex min-h-[38px] items-center rounded-full px-4 text-sm font-bold transition-colors', path === tab.href ? 'bg-brand text-brand-on shadow-soft' : 'text-muted hover:text-ink')}>
                {tx(tab.bn, tab.en)}
              </Link>
            ))}
          </nav>
        </div>
        {children}
      </main>
    </div>
  );
}
