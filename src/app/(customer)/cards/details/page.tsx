'use client';

import Link from 'next/link';
import { ArrowLeft, CupSoda, MapPin, QrCode } from 'lucide-react';
import { LoyaltyCard } from '@/components/loyalty-card';
import { ActivityBadge } from '@/components/activity-badge';
import { ButtonLink, Card, CardTitle } from '@/components/ui';
import { useBranches } from '@/lib/api/branches';
import { useHistory } from '@/lib/api/history';
import { useProgram } from '@/lib/api/program';
import { useI18n } from '@/lib/i18n';
import { useCardView, useMemberQr, useWallet } from '@/lib/wallet';

const TILE = [
  { bg: 'var(--sky-soft)', chip: '#7FCBFF' },
  { bg: 'var(--tangerine-soft)', chip: '#FEAD28' },
  { bg: 'var(--rose-soft)', chip: '#FF8A9A' },
];

export default function CardDetailPage() {
  const { tx, l, n } = useI18n();
  const { me, memberCode } = useWallet();
  const { collected, fresh } = useCardView();
  const shop = useProgram();
  const qr = useMemberQr();
  const { branches } = useBranches();
  const { items: cardHistory, loading: historyLoading } = useHistory(8);
  const { program } = shop;

  const rules = [
    [tx('Reward-এর জন্য', 'Stamps for a reward'), tx(`${n(shop.total)}টি Stamp`, `${shop.total} stamps`)],
    [tx('Stamp পাবেন', 'Earn a stamp'), tx(`প্রতি ৳${n(program.minPurchase)}+ কেনাকাটায়`, `Every ৳${program.minPurchase}+ purchase`)],
    [tx('দিনে সর্বোচ্চ', 'Daily limit'), program.dailyLimit === 0 ? tx('সীমা নেই', 'No limit') : tx(`${n(program.dailyLimit)}টি Stamp`, `${program.dailyLimit} stamp${program.dailyLimit > 1 ? 's' : ''}`)],
    [tx('Stamp-এর মেয়াদ', 'Stamps expire'), program.expiryDays === 0 ? tx('কখনো না', 'Never') : tx(`${n(program.expiryDays)} দিন`, `After ${program.expiryDays} days`)],
    [tx('কোথায় চলবে', 'Valid at'), tx('আইচা ধানমন্ডি', 'AiCha Dhanmondi')],
  ];

  return (
    <>
      <Link href="/cards" className="inline-flex min-h-10 items-center gap-1.5 self-start text-[15px] font-bold">
        <ArrowLeft size={18} aria-hidden="true" />
        {tx('আমার কার্ডে ফিরুন', 'Back to my card')}
      </Link>
      <div className="flex flex-wrap items-start gap-[18px]">
        <div className="flex min-w-0 flex-[3_1_340px] flex-col gap-[18px]">
          <LoyaltyCard shop={shop} collected={collected} fresh={fresh} memberName={me?.name ?? undefined} memberId={memberCode} qrValue={qr} />
          <Card>
            <CardTitle>{tx('Reward অপশন', 'Reward options')}</CardTitle>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2.5">
              {shop.rewardItems.map((item, i) => (
                <div key={i} className="flex flex-col gap-2.5 rounded-[18px] p-4" style={{ background: TILE[i % 3].bg }}>
                  <span className="flex size-10 items-center justify-center rounded-[13px] text-navy" style={{ background: TILE[i % 3].chip }}>
                    <CupSoda size={22} aria-hidden="true" />
                  </span>
                  <span className="font-bold">{l(item)}</span>
                  <span className="text-[13px] text-muted">{tx(`${n(shop.total)}টি Stamp`, `${shop.total} stamps`)}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <div className="flex min-w-0 flex-[2_1_280px] flex-col gap-[18px]">
          <ButtonLink href="/cards" size="lg">
            <QrCode size={20} aria-hidden="true" />
            {tx('Stamp নিতে QR দেখান', 'Show QR to get a stamp')}
          </ButtonLink>
          <Card>
            <CardTitle>{tx('কার্ডের নিয়ম', 'Card rules')}</CardTitle>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2.5 text-sm">
              {rules.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-right font-bold">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <div className="flex items-center gap-3 rounded-card border border-line bg-surface p-4 shadow-soft">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-brand-soft text-brand-ink"><MapPin size={22} aria-hidden="true" /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold">{tx('আইচা ধানমন্ডিতে চলবে', 'Valid at AiCha Dhanmondi')}</span>
              {branches[0] && <span className="block text-sm text-muted">{l(branches[0].address)}</span>}
            </span>
          </div>
          <Card>
            <CardTitle action={<Link href="/history" className="text-sm font-bold">{tx('সব দেখুন', 'See all')}</Link>}>{tx('এই কার্ডের ইতিহাস', 'This card’s history')}</CardTitle>
            {historyLoading ? (
              <div role="status" aria-label={tx('লোড হচ্ছে', 'Loading')} className="flex flex-col gap-2 py-1">
                {[0, 1, 2].map((i) => <div key={i} className="h-11 animate-pulse rounded-xl bg-surface2" />)}
              </div>
            ) : cardHistory.length === 0 ? (
              <p className="text-sm text-muted">{tx('প্রথম Stamp নিতে আইচা ধানমন্ডিতে QR দেখান।', 'Show your QR at AiCha Dhanmondi to get your first stamp.')}</p>
            ) : (
              <ul>
                {cardHistory.map((h, i) => (
                  <li key={i} className="flex min-h-[52px] items-center gap-3 border-t border-line">
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{l(h.detail)}</span>
                      <span className="block text-[13px] text-muted">{l(h.time)}</span>
                    </span>
                    <ActivityBadge item={h} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
