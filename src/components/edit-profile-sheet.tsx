'use client';

import { useEffect, useState } from 'react';
import { Cake, Lock, Mail, User } from 'lucide-react';
import { mutate } from 'swr';
import { Button, Field, Switch, inputClass } from '@/components/ui';
import { Sheet } from '@/components/sheet';
import { api } from '@/lib/api/client';
import { errorText } from '@/lib/api/messages';
import type { MeDto } from '@/lib/contracts/dto';
import { day } from '@/lib/format';
import { useI18n, type Text } from '@/lib/i18n';
import { cn } from '@/lib/cn';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** "Edit profile" as a bottom sheet: name, email, birthday (locked once it has been saved) and the offer SMS choice. */
export function EditProfileSheet({ open, onClose, me }: { open: boolean; onClose: () => void; me: MeDto | null }) {
  const { tx, l, lang } = useI18n();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [birthday, setBirthday] = useState('');
  const [sms, setSms] = useState(false);
  const [error, setError] = useState<Text | null>(null);
  const [field, setField] = useState<'name' | 'email' | null>(null);
  const [busy, setBusy] = useState(false);

  const locked = !!me?.birthday;

  // Every time the sheet opens, start from what is saved.
  useEffect(() => {
    if (!open || !me) return;
    setName(me.name ?? '');
    setEmail(me.email ?? '');
    setBirthday(me.birthday ?? '');
    setSms(me.smsConsent);
    setError(null);
    setField(null);
    setBusy(false);
  }, [open, me]);

  const reject = (f: 'name' | 'email', text: Text) => {
    setField(f);
    setError(text);
  };

  const save = async () => {
    const trimmed = name.replace(/\s+/g, ' ').trim();
    const mail = email.trim().toLowerCase();
    if (trimmed.length < 2) return reject('name', { bn: 'আপনার নাম লিখুন', en: 'Enter your name' });
    if (mail && !EMAIL.test(mail)) return reject('email', { bn: 'সঠিক ইমেইল ঠিকানা লিখুন', en: 'Enter a valid email address' });
    setBusy(true);
    setError(null);
    setField(null);
    try {
      const body: Record<string, unknown> = { name: trimmed, email: mail, smsConsent: sms, language: lang };
      if (!locked && birthday) body.birthday = birthday;
      const updated = await api.patch<MeDto>('/api/me', body);
      await mutate('/api/auth/session', { customer: updated, staff: null }, { revalidate: true });
      await mutate('/api/me/wallet');
      onClose();
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  };

  const lockedOn = me?.birthday ? day(Date.parse(`${me.birthday}T06:00:00+06:00`)) : null;
  const icon = 'pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted';

  return (
    <Sheet open={open} onClose={onClose} title={tx('প্রোফাইল এডিট', 'Edit profile')} subtitle={tx('আপনার তথ্য ঠিক রাখুন', 'Keep your details up to date')}>
      <form
        className="flex flex-col gap-4 pb-1 pt-2"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        noValidate
      >
        <Field id="ep-name" label={tx('আপনার নাম', 'Your name')} error={field === 'name' && error ? l(error) : undefined}>
          <div className="relative">
            <User size={18} className={icon} aria-hidden="true" />
            <input id="ep-name" autoComplete="name" value={name} onChange={(e) => { setName(e.target.value); setError(null); }} className={cn(inputClass, 'pl-11')} />
          </div>
        </Field>
        <Field
          id="ep-email"
          label={<>{tx('ইমেইল', 'Email')} <span className="font-medium text-muted">{tx('(ঐচ্ছিক)', '(optional)')}</span></>}
          hint={tx('রসিদ ও গুরুত্বপূর্ণ খবরের জন্য', 'For receipts and important news')}
          error={field === 'email' && error ? l(error) : undefined}
        >
          <div className="relative">
            <Mail size={18} className={icon} aria-hidden="true" />
            <input id="ep-email" type="email" inputMode="email" autoComplete="email" placeholder="name@example.com" value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }} className={cn(inputClass, 'pl-11')} />
          </div>
        </Field>
        <Field
          id="ep-bday"
          label={tx('জন্মদিন', 'Birthday')}
          hint={
            locked ? (
              <span className="flex items-start gap-1.5"><Lock size={16} className="mt-0.5 shrink-0" aria-hidden="true" />{tx('জন্মদিন একবার সেট করলে আর বদলানো যায় না। ভুল হলে আউটলেটে জানান।', 'Your birthday is locked once it is set. If it is wrong, tell us at the counter.')}</span>
            ) : (
              <span className="flex items-start gap-1.5"><Cake size={16} className="mt-0.5 shrink-0" aria-hidden="true" />{tx('সাবধানে দিন: একবার সেট করলে আর বদলানো যাবে না।', 'Choose carefully: you cannot change it after you save.')}</span>
            )
          }
        >
          {locked ? (
            <div className="relative">
              <Lock size={18} className={icon} aria-hidden="true" />
              <input id="ep-bday" readOnly aria-readonly="true" value={lockedOn ? l(lockedOn) : ''} className={cn(inputClass, 'cursor-not-allowed bg-surface2 pl-11 text-muted')} />
            </div>
          ) : (
            <input id="ep-bday" type="date" value={birthday} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setBirthday(e.target.value)} className={inputClass} />
          )}
        </Field>
        <div className="flex items-center gap-4 rounded-[18px] border border-line bg-surface2 px-4 py-3.5">
          <div className="flex-1">
            <p className="font-bold">{tx('অফারের SMS পেতে চাই', 'Send me offers by SMS')}</p>
            <p className="text-[13px] text-muted">{tx('যেকোনো সময় বন্ধ করা যাবে', 'You can turn this off anytime')}</p>
          </div>
          <Switch checked={sms} onChange={setSms} label={tx('অফারের SMS', 'Offer SMS')} />
        </div>
        {error && !field && <p role="alert" className="text-[13px] font-semibold text-danger">{l(error)}</p>}
        <div className="flex gap-2.5 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={busy}>{tx('বাতিল', 'Cancel')}</Button>
          <Button type="submit" className="flex-[2]" disabled={busy || !me}>{busy ? tx('সেভ হচ্ছে…', 'Saving…') : tx('সেভ করুন', 'Save changes')}</Button>
        </div>
      </form>
    </Sheet>
  );
}
