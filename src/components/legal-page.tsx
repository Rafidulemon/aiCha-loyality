'use client';

import type { ReactNode } from 'react';
import { CalendarClock } from 'lucide-react';
import { Mascot } from '@/components/brand';
import { LEGAL_UPDATED, type Section } from '@/lib/legal';
import { useI18n, type Text } from '@/lib/i18n';

/** A coloured banner at the top of Help, Privacy and Terms. */
export function InfoHero({ icon, title, subtitle, children }: { icon: ReactNode; title: Text; subtitle: Text; children?: ReactNode }) {
  const { l } = useI18n();
  return (
    <section className="relative isolate overflow-hidden rounded-hero p-6 text-white shadow-lift md:p-8" style={{ background: 'radial-gradient(300px 220px at 100% 0%, rgba(254,173,40,0.45), transparent 70%), linear-gradient(135deg, #f2183f 0%, #d1002a 55%, #a30019 100%)' }}>
      <Mascot size={150} className="pointer-events-none absolute -bottom-5 -right-2 -z-10 hidden h-[150px] w-auto -rotate-6 opacity-95 drop-shadow-[0_10px_16px_rgba(0,0,0,0.3)] sm:block" />
      <span className="flex size-12 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/30 backdrop-blur">{icon}</span>
      <h1 className="mt-4 font-display text-[clamp(30px,5vw,42px)] font-extrabold leading-tight">{l(title)}</h1>
      <p className="mt-1.5 max-w-[34ch] text-[17px] text-white/90 sm:max-w-[44ch]">{l(subtitle)}</p>
      {children}
    </section>
  );
}

/** The privacy policy and terms: a hero, the date, and numbered sections in cards. */
export function LegalDocument({ icon, title, subtitle, sections }: { icon: ReactNode; title: Text; subtitle: Text; sections: Section[] }) {
  const { tx, l, n } = useI18n();
  return (
    <>
      <InfoHero icon={icon} title={title} subtitle={subtitle}>
        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-black/20 px-3 py-1.5 text-[13px] font-semibold backdrop-blur">
          <CalendarClock size={14} aria-hidden="true" />
          {tx(`সর্বশেষ আপডেট: ${l(LEGAL_UPDATED)}`, `Last updated: ${l(LEGAL_UPDATED)}`)}
        </p>
      </InfoHero>

      <nav aria-label={tx('এই পাতায়', 'On this page')} className="flex flex-wrap gap-2">
        {sections.map((s, i) => (
          <a key={s.id} href={`#${s.id}`} className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm font-semibold text-muted shadow-soft hover:text-ink">
            {n(i + 1)}. {l(s.title)}
          </a>
        ))}
      </nav>

      <div className="flex flex-col gap-4">
        {sections.map((s, i) => (
          <section key={s.id} id={s.id} className="scroll-mt-24 rounded-card border border-line bg-surface p-5 shadow-soft md:p-6">
            <h2 className="flex items-center gap-3 font-display text-xl font-bold">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-extrabold text-brand-ink">{n(i + 1)}</span>
              {l(s.title)}
            </h2>
            {s.body?.map((p, j) => <p key={j} className="mt-3 leading-relaxed text-ink/90">{l(p)}</p>)}
            {s.bullets && (
              <ul className="mt-3 flex flex-col gap-2.5">
                {s.bullets.map((b, j) => (
                  <li key={j} className="flex items-start gap-3 leading-relaxed text-ink/90">
                    <span aria-hidden="true" className="mt-[9px] size-2 shrink-0 rounded-full bg-tangerine" />
                    <span>{l(b)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
