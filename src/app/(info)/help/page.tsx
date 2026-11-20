'use client';

import { ChevronDown, Clock, Facebook, LifeBuoy, MapPin, Navigation, Phone } from 'lucide-react';
import { InfoHero } from '@/components/legal-page';
import { ButtonLink } from '@/components/ui';
import { CONTACT, FAQ } from '@/lib/legal';
import { useI18n } from '@/lib/i18n';

export default function HelpPage() {
  const { tx, l } = useI18n();
  return (
    <>
      <InfoHero
        icon={<LifeBuoy size={26} aria-hidden="true" />}
        title={{ bn: 'সাহায্য ও সাপোর্ট', en: 'Help and support' }}
        subtitle={{ bn: 'প্রশ্নের উত্তর খুঁজুন, অথবা সরাসরি আমাদের সাথে কথা বলুন।', en: 'Find an answer, or talk to us directly.' }}
      >
        <div className="mt-5 flex flex-wrap gap-2.5">
          <a href={`tel:${CONTACT.phone}`} className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-white px-5 font-bold text-[#a30019] shadow-[0_10px_20px_-10px_rgba(0,0,0,0.55)] transition active:scale-[0.98]">
            <Phone size={18} aria-hidden="true" />{tx('ফোন করুন', 'Call us')} · {CONTACT.phoneShown}
          </a>
        </div>
      </InfoHero>

      <section aria-labelledby="visit" className="grid gap-3.5 sm:grid-cols-2">
        <h2 id="visit" className="sr-only">{tx('যোগাযোগ', 'Contact')}</h2>
        <div className="flex gap-3.5 rounded-card border border-line bg-surface p-5 shadow-soft">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-brand-soft text-brand-ink"><MapPin size={22} aria-hidden="true" /></span>
          <div className="min-w-0">
            <p className="font-display text-lg font-bold">{tx('আইচা ধানমন্ডি', 'AiCha Dhanmondi')}</p>
            <p className="mt-0.5 text-sm leading-relaxed text-muted">{l(CONTACT.address)}</p>
            <ButtonLink href={CONTACT.map} target="_blank" rel="noreferrer" size="sm" className="mt-3">
              <Navigation size={16} aria-hidden="true" />{tx('দিকনির্দেশ', 'Directions')}
            </ButtonLink>
          </div>
        </div>
        <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5 shadow-soft">
          <div className="flex items-center gap-3.5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-tangerine-soft text-warn"><Clock size={22} aria-hidden="true" /></span>
            <div>
              <p className="text-[13px] font-semibold text-muted">{tx('খোলা থাকে', 'Open')}</p>
              <p className="font-bold">{l(CONTACT.hours)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3.5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-sky-soft text-info"><Facebook size={22} aria-hidden="true" /></span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-muted">{tx('ফেসবুকে', 'On Facebook')}</p>
              <a href={CONTACT.facebook} target="_blank" rel="noreferrer" className="font-bold underline underline-offset-4">Ai-Cha Dhanmondi</a>
            </div>
          </div>
          <p className="text-[13px] text-muted">{tx('এটি টেকঅ্যাওয়ে ও ডেলিভারির দোকান, বসার জায়গা নেই।', 'We are a takeaway and delivery shop with no dine-in seating.')}</p>
        </div>
      </section>

      <section aria-labelledby="faq" className="flex flex-col gap-3">
        <h2 id="faq" className="font-display text-2xl font-extrabold">{tx('সাধারণ প্রশ্ন', 'Common questions')}</h2>
        <div className="flex flex-col gap-2.5">
          {FAQ.map((item, i) => (
            <details key={i} className="group rounded-card border border-line bg-surface shadow-soft open:border-line2 open:shadow-lift">
              <summary className="flex min-h-[60px] cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 font-bold [&::-webkit-details-marker]:hidden">
                <span>{l(item.q)}</span>
                <ChevronDown size={20} className="shrink-0 text-muted transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
              </summary>
              <p className="px-5 pb-5 leading-relaxed text-ink/90">{l(item.a)}</p>
            </details>
          ))}
        </div>
      </section>

      <p className="text-center text-sm text-muted">{tx('উত্তর পাননি? আউটলেটে আসুন বা ফোন করুন, আমরা সাহায্য করব।', 'Did not find your answer? Visit the outlet or call us and we will help.')}</p>
    </>
  );
}
