'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { BadgeCheck, Bell, BellRing, CalendarHeart, Cake, ChevronRight, Clock, FileText, Globe, HelpCircle, Lock, LogOut, Mail, Moon, Pencil, Phone, Send, Shield, Smartphone, Trash2 } from 'lucide-react';
import { Mascot } from '@/components/brand';
import { EditProfileSheet } from '@/components/edit-profile-sheet';
import { Badge, Button, Card, Notice, Segmented, Switch } from '@/components/ui';
import { api } from '@/lib/api/client';
import { errorText } from '@/lib/api/messages';
import { usePush } from '@/lib/api/push';
import { signOut } from '@/lib/api/session';
import type { MeDto } from '@/lib/contracts/dto';
import { formatPhone } from '@/lib/domain/phone';
import { day, initialOf } from '@/lib/format';
import { useI18n, type Lang, type Text } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { useWallet } from '@/lib/wallet';
import { mutate } from 'swr';

function Row({ icon, color, label, sub, children }: { icon: ReactNode; color: string; label: string; sub?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-[60px] flex-wrap items-center gap-3 border-t border-line py-2">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl text-navy" style={{ background: color }}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{label}</span>
        {sub && <span className="block text-[13px] text-muted">{sub}</span>}
      </span>
      {children}
    </div>
  );
}

function InfoRow({ icon, color, label, value, empty, badge, onClick }: { icon: ReactNode; color: string; label: string; value?: string; empty?: string; badge?: ReactNode; onClick?: () => void }) {
  const body = (
    <>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl text-navy" style={{ background: color }}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold text-muted">{label}</span>
        <span className={value ? 'block truncate font-semibold text-ink' : 'block font-semibold text-brand-ink'}>{value || empty}</span>
      </span>
      {badge}
      {onClick && <ChevronRight size={20} className="shrink-0 text-muted" aria-hidden="true" />}
    </>
  );
  const cls = 'flex min-h-[64px] w-full items-center gap-3 border-t border-line py-2 text-left';
  return onClick ? <button type="button" onClick={onClick} className={cls}>{body}</button> : <div className={cls}>{body}</div>;
}

function LinkRow({ icon, color, label, value, href = '#' }: { icon: ReactNode; color: string; label: string; value?: string; href?: string }) {
  return (
    <Link href={href} className="flex min-h-[60px] items-center gap-3 border-t border-line">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl text-navy" style={{ background: color }}>{icon}</span>
      <span className="flex-1 font-semibold text-ink">{label}</span>
      {value && <span className="text-sm text-muted">{value}</span>}
      <ChevronRight size={20} className="text-muted" aria-hidden="true" />
    </Link>
  );
}

export default function ProfilePage() {
  const { tx, l, n, lang, setLang } = useI18n();
  const { theme, setTheme } = useTheme();
  const { me, lifetime, earned, readyVouchers } = useWallet();
  const [problem, setProblem] = useState<Text | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const push = usePush(me?.id);
  const stats = [
    [lifetime, tx('Stamp', 'Stamps')],
    [earned, tx('Reward', 'Rewards')],
    [readyVouchers.length, tx('রেডি', 'Ready now')],
  ] as const;

  const name = me?.name ?? '';
  const initial = initialOf(name || null);
  const joined = me?.joinedAt ? day(Date.parse(me.joinedAt)) : null;
  const birthday = me?.birthday ? day(Date.parse(`${me.birthday}T06:00:00+06:00`)) : null;

  /** Saves a profile change and refreshes the wallet so every screen sees it. */
  const patch = async (body: Partial<Pick<MeDto, 'smsConsent' | 'pushNotify' | 'emailNotify' | 'language'>>) => {
    setProblem(null);
    try {
      await api.patch<MeDto>('/api/me', body);
      await Promise.all([mutate('/api/me/wallet'), mutate('/api/auth/session')]);
    } catch (e) {
      setProblem(errorText(e));
    }
  };

  // Both are allowed until the customer says otherwise. Push also needs this browser's permission, asked when it is switched on.
  const pushOn = me?.pushNotify ?? true;
  const emailOn = me?.emailNotify ?? true;
  const changePush = async (on: boolean) => {
    await patch({ pushNotify: on });
    if (on && push.state === 'off') await push.enable();
    if (!on && push.state === 'on') await push.disable();
  };

  const changeLang = (next: Lang) => {
    setLang(next);
    void patch({ language: next }); // the server uses it for the language of SMS
  };

  const eraseAccount = async () => {
    setBusy(true);
    setProblem(null);
    try {
      await api.post('/api/me/delete', { confirm: true });
      window.location.assign('/login');
    } catch (e) {
      setProblem(errorText(e));
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-start gap-[18px]">
      <EditProfileSheet open={editing} onClose={() => setEditing(false)} me={me ?? null} />
      <div className="flex min-w-0 flex-[2_1_300px] flex-col gap-3.5">
        <section className="relative isolate flex flex-col gap-5 overflow-hidden rounded-hero p-5 text-white shadow-lift sm:p-6" style={{ background: 'radial-gradient(260px 200px at 100% 0%, rgba(254,173,40,0.45), transparent 70%), linear-gradient(135deg, #f2183f 0%, #d1002a 55%, #a30019 100%)' }}>
          <Mascot size={150} className="pointer-events-none absolute -bottom-4 -right-3 -z-10 h-[150px] w-auto -rotate-6 opacity-95 drop-shadow-[0_10px_16px_rgba(0,0,0,0.3)]" />
          <div className="flex items-center gap-3.5">
            <span className="flex size-[68px] shrink-0 items-center justify-center rounded-full bg-white font-display text-[28px] font-extrabold text-[#d1002a] shadow-[0_0_0_4px_rgba(254,173,40,0.9),0_10px_20px_-6px_rgba(0,0,0,0.4)]">{l(initial)}</span>
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-[26px] font-extrabold leading-tight">{name || tx('আপনার নাম', 'Your name')}</h1>
              <p className="truncate font-medium text-white/90">{me ? formatPhone(me.phone) : ''}</p>
              {me?.email && <p className="truncate text-[13px] text-white/80">{me.email}</p>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setEditing(true)} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-[15px] font-bold text-[#a30019] shadow-[0_8px_18px_-8px_rgba(0,0,0,0.5)] transition active:scale-[0.97]">
              <Pencil size={16} aria-hidden="true" />{tx('প্রোফাইল এডিট', 'Edit profile')}
            </button>
            {joined && <span className="inline-flex items-center gap-1.5 rounded-full bg-black/20 px-3 py-1.5 text-[13px] font-semibold backdrop-blur"><CalendarHeart size={14} aria-hidden="true" />{tx(`সদস্য হয়েছেন ${l(joined)}`, `Member since ${l(joined)}`)}</span>}
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {stats.map(([v, label]) => (
              <div key={label} className="rounded-2xl bg-white/15 px-1 py-3 ring-1 ring-white/25 backdrop-blur">
                <p className="font-display text-2xl font-extrabold leading-none">{n(v)}</p>
                <p className="mt-1 text-xs font-semibold text-white/90">{label}</p>
              </div>
            ))}
          </div>
        </section>
        <Card className="px-5 py-2">
          <h2 className="my-3 font-display text-lg font-bold">{tx('ব্যক্তিগত তথ্য', 'Personal info')}</h2>
          <InfoRow icon={<Phone size={18} aria-hidden="true" />} color="#7FCBFF" label={tx('মোবাইল নম্বর', 'Mobile number')} value={me ? formatPhone(me.phone) : ''} badge={<Badge tone="ok"><BadgeCheck size={13} className="mr-1" aria-hidden="true" />{tx('যাচাই করা', 'Verified')}</Badge>} />
          <InfoRow icon={<Mail size={18} aria-hidden="true" />} color="#FEAD28" label={tx('ইমেইল', 'Email')} value={me?.email ?? undefined} empty={tx('যোগ করুন', 'Add email')} onClick={() => setEditing(true)} />
          <InfoRow
            icon={<Cake size={18} aria-hidden="true" />}
            color="#FF8FB1"
            label={tx('জন্মদিন', 'Birthday')}
            value={birthday ? l(birthday) : undefined}
            empty={tx('যোগ করুন', 'Add birthday')}
            badge={birthday ? <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-muted"><Lock size={14} aria-hidden="true" />{tx('লক করা', 'Locked')}</span> : undefined}
            onClick={birthday ? undefined : () => setEditing(true)}
          />
          <LinkRow icon={<Clock size={18} aria-hidden="true" />} color="#E6012C" label={tx('Stamp ও Reward-এর ইতিহাস', 'Stamp and reward history')} href="/history" />
        </Card>
      </div>

      <div className="flex min-w-0 flex-[3_1_340px] flex-col gap-3.5">
        {problem && <Notice tone="danger">{l(problem)}</Notice>}
        {push.problem && <Notice tone="danger">{l(push.problem)}</Notice>}
        {push.testNote && <Notice>{l(push.testNote)}</Notice>}
        <Card className="px-5 py-2">
          <h2 className="my-3 font-display text-lg font-bold">{tx('পছন্দ', 'Preferences')}</h2>
          <Row icon={<Globe size={18} aria-hidden="true" />} color="#7FD8CE" label={tx('ভাষা', 'Language')}>
            <Segmented label={tx('ভাষা', 'Language')} value={lang} onChange={changeLang} options={[{ value: 'bn', label: 'বাংলা' }, { value: 'en', label: 'English' }]} />
          </Row>
          <Row icon={<Moon size={18} aria-hidden="true" />} color="#FEAD28" label={tx('থিম', 'Theme')}>
            <Segmented label={tx('থিম', 'Theme')} value={theme} onChange={setTheme} options={[{ value: 'light', label: tx('লাইট', 'Light') }, { value: 'dark', label: tx('ডার্ক', 'Dark') }]} />
          </Row>
        </Card>
        <Card className="px-5 py-2">
          <h2 className="my-3 font-display text-lg font-bold">{tx('নোটিফিকেশন', 'Notifications')}</h2>
          <Row icon={<Send size={18} aria-hidden="true" />} color="#FF8A9A" label={tx('অফারের SMS', 'Offer SMS')} sub={tx('আইচা-এর বিশেষ অফার', 'Special deals from AiCha')}>
            <Switch checked={me?.smsConsent ?? false} onChange={(v) => void patch({ smsConsent: v })} label={tx('অফারের SMS', 'Offer SMS')} />
          </Row>
          {push.state !== 'unavailable' && (
            <Row
              icon={<BellRing size={18} aria-hidden="true" />}
              color="#FEAD28"
              label={tx('পুশ নোটিফিকেশন', 'Push notifications')}
              sub={
                !pushOn
                  ? tx('বন্ধ আছে। চালু করলে Stamp বা Reward পেলে জানানো হবে।', 'Off. Turn on to hear when you earn a stamp or a reward.')
                  : push.state === 'unsupported'
                    ? tx('এই ব্রাউজারে পুশ নোটিফিকেশন চলে না। আইফোনে আগে আইচা হোম স্ক্রিনে যোগ করুন।', 'This browser can’t show push notifications. On an iPhone, add AiCha to your Home Screen first.')
                    : push.state === 'denied'
                      ? tx('ব্রাউজারের সেটিংসে বন্ধ করা আছে। এই সাইটের নোটিফিকেশন চালু করে আবার চেষ্টা করুন।', 'Blocked in your browser settings. Allow notifications for this site, then try again.')
                      : push.state === 'on'
                        ? push.devices > 1
                          ? tx(`Stamp বা Reward পেলে নোটিফিকেশন আসবে · ${n(push.devices)}টি ডিভাইসে চালু`, `A notification when you earn a stamp or a reward · on for ${push.devices} devices`)
                          : tx('Stamp বা Reward পেলে এই ডিভাইসে নোটিফিকেশন আসবে', 'A notification on this device when you earn a stamp or a reward')
                        : tx('চালু আছে। এই ডিভাইসে পেতে অনুমতি দিন।', 'On. Allow it on this device to receive them.')
              }
            >
              {pushOn && push.state === 'off' && (
                <button type="button" disabled={push.busy} onClick={() => void push.enable()} className="rounded-full bg-brand-soft px-3 py-1.5 text-sm font-bold text-brand-ink">{tx('অনুমতি দিন', 'Allow')}</button>
              )}
              <Switch
                checked={pushOn}
                disabled={push.busy || push.state === 'loading'}
                onChange={(on) => void changePush(on)}
                label={tx('পুশ নোটিফিকেশন', 'Push notifications')}
              />
            </Row>
          )}
          {push.state === 'on' && pushOn && (
            <Row icon={<Smartphone size={18} aria-hidden="true" />} color="#7FCBFF" label={tx('টেস্ট নোটিফিকেশন', 'Test notification')} sub={tx('এই ডিভাইসে পৌঁছায় কিনা দেখুন', 'Check that it reaches this device')}>
              <button type="button" onClick={() => void push.sendTest()} className="font-bold text-ink underline underline-offset-4">{tx('পাঠান', 'Send')}</button>
            </Row>
          )}
          <Row
            icon={<Mail size={18} aria-hidden="true" />}
            color="#8FE3D8"
            label={tx('ইমেইল নোটিফিকেশন', 'Email notifications')}
            sub={
              !emailOn
                ? tx('বন্ধ আছে।', 'Off.')
                : me?.email
                  ? tx(`Reward ও গুরুত্বপূর্ণ খবর ${me.email} ঠিকানায় যাবে`, `Rewards and important news go to ${me.email}`)
                  : tx('চালু আছে। পেতে আপনার ইমেইল যোগ করুন।', 'On. Add your email address to receive them.')
            }
          >
            {emailOn && !me?.email && (
              <button type="button" onClick={() => setEditing(true)} className="rounded-full bg-brand-soft px-3 py-1.5 text-sm font-bold text-brand-ink">{tx('ইমেইল যোগ', 'Add email')}</button>
            )}
            <Switch checked={emailOn} onChange={(v) => void patch({ emailNotify: v })} label={tx('ইমেইল নোটিফিকেশন', 'Email notifications')} />
          </Row>
          <Row icon={<Bell size={18} aria-hidden="true" />} color="#8FE3D8" label={tx('অ্যাপের নোটিফিকেশন', 'In-app notifications')} sub={tx('Stamp, Reward ও অফারের খবর নোটিফিকেশন পাতায় দেখা যায়', 'Stamp, reward and offer news appears on the Notifications page')}>
            <Link href="/notifications" className="font-bold text-ink underline underline-offset-4">{tx('দেখুন', 'Open')}</Link>
          </Row>
        </Card>
        <Card className="px-5 py-2">
          <h2 className="my-3 font-display text-lg font-bold">{tx('সাহায্য', 'Help')}</h2>
          <LinkRow icon={<HelpCircle size={18} aria-hidden="true" />} color="#7FCBFF" label={tx('সাহায্য ও সাপোর্ট', 'Help and support')} href="/help" />
          <LinkRow icon={<Shield size={18} aria-hidden="true" />} color="#8FE3D8" label={tx('প্রাইভেসি পলিসি', 'Privacy policy')} href="/privacy" />
          <LinkRow icon={<FileText size={18} aria-hidden="true" />} color="#B8D4CF" label={tx('শর্তাবলী', 'Terms of service')} href="/terms" />
        </Card>
        <div className="flex flex-wrap gap-2.5">
          <Button variant="secondary" className="flex-[1_1_160px]" onClick={() => void signOut('customer')}><LogOut size={18} aria-hidden="true" />{tx('লগআউট', 'Log out')}</Button>
          <Button variant="danger" className="flex-[1_1_160px]" onClick={() => setConfirmDelete(true)}><Trash2 size={18} aria-hidden="true" />{tx('অ্যাকাউন্ট মুছুন', 'Delete account')}</Button>
        </div>
        {confirmDelete && (
          <Card className="flex flex-col gap-3 border-2 border-danger">
            <h2 className="text-lg font-bold">{tx('অ্যাকাউন্ট মুছে ফেলবেন?', 'Delete your account?')}</h2>
            <p className="text-sm text-muted">{tx('আপনার নাম, নম্বর ও জন্মদিন মুছে যাবে এবং জমানো Stamp ও Reward আর পাওয়া যাবে না। এটি ফেরানো যায় না।', 'Your name, number and birthday are erased, and your stamps and rewards can no longer be used. This cannot be undone.')}</p>
            <div className="flex flex-wrap gap-2.5">
              <Button variant="danger" onClick={() => void eraseAccount()} disabled={busy}>{busy ? tx('মোছা হচ্ছে…', 'Deleting…') : tx('হ্যাঁ, মুছে ফেলুন', 'Yes, delete it')}</Button>
              <Button variant="secondary" onClick={() => setConfirmDelete(false)} disabled={busy}>{tx('না, থাক', 'No, keep it')}</Button>
            </div>
          </Card>
        )}
        <p className="text-center text-[13px] text-muted">{tx('AiCha loyality · ভার্সন ১.০', 'AiCha loyality · Version 1.0')}</p>
      </div>
    </div>
  );
}
