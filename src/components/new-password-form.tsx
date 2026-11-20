'use client';

import { useState, type ReactNode } from 'react';
import { Check, Circle } from 'lucide-react';
import { PasswordField } from '@/components/password-field';
import { Button, Field } from '@/components/ui';
import { errorText } from '@/lib/api/messages';
import { PASSWORD_ISSUE_TEXT, PASSWORD_MIN, passwordIssue } from '@/lib/domain/password';
import { useI18n, type Text } from '@/lib/i18n';
import { cn } from '@/lib/cn';

/**
 * "Choose a password": two boxes (the password and the same again), a live checklist, and one button. Used for the first password
 * after the one-time sign-in and for the reset after "Forgot password". `onSubmit` does the saving and may throw.
 */
export function NewPasswordForm({ phone, submitLabel, onSubmit, children }: { phone?: string; submitLabel: Text; onSubmit: (password: string) => Promise<void>; children?: ReactNode }) {
  const { tx, l } = useI18n();
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [error, setError] = useState<Text | null>(null);
  const [busy, setBusy] = useState(false);

  const issue = password ? passwordIssue(password, phone) : null;
  const longEnough = password.length >= PASSWORD_MIN;
  const matches = again.length > 0 && again === password;

  const submit = async () => {
    const problem = passwordIssue(password, phone);
    if (problem) return setError(PASSWORD_ISSUE_TEXT[problem]);
    if (again !== password) return setError({ bn: 'দুটি পাসওয়ার্ড মেলেনি', en: 'The two passwords do not match' });
    setBusy(true);
    setError(null);
    try {
      await onSubmit(password);
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  };

  const Rule = ({ ok, children: text }: { ok: boolean; children: ReactNode }) => (
    <li className={cn('flex items-center gap-2 text-sm', ok ? 'font-semibold text-ok' : 'text-muted')}>
      {ok ? <Check size={16} aria-hidden="true" /> : <Circle size={16} aria-hidden="true" />}
      {text}
    </li>
  );

  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      {children}
      <Field id="new-password" label={tx('নতুন পাসওয়ার্ড', 'New password')} error={issue && issue !== 'short' ? l(PASSWORD_ISSUE_TEXT[issue]) : undefined}>
        <PasswordField id="new-password" value={password} onChange={(v) => { setPassword(v); setError(null); }} autoComplete="new-password" autoFocus />
      </Field>
      <Field id="confirm-password" label={tx('পাসওয়ার্ড আবার লিখুন', 'Repeat the password')} error={error ? l(error) : undefined}>
        <PasswordField id="confirm-password" value={again} onChange={(v) => { setAgain(v); setError(null); }} autoComplete="new-password" invalid={!!error} />
      </Field>
      <ul className="flex flex-col gap-1.5" aria-label={tx('পাসওয়ার্ডের নিয়ম', 'Password rules')}>
        <Rule ok={longEnough && issue !== 'weak' && issue !== 'phone'}>{tx(`অন্তত ${PASSWORD_MIN}টি অক্ষর, সহজ অনুমানযোগ্য নয়`, `At least ${PASSWORD_MIN} characters, not easy to guess`)}</Rule>
        <Rule ok={matches}>{tx('দুটি পাসওয়ার্ড মিলেছে', 'Both passwords match')}</Rule>
      </ul>
      <Button type="submit" size="lg" disabled={busy}>{busy ? tx('সেভ হচ্ছে…', 'Saving…') : l(submitLabel)}</Button>
    </form>
  );
}
