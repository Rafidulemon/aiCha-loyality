'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { inputClass } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/cn';

/** A password box with a show / hide button, so a typing mistake on a phone is easy to see. */
export function PasswordField({
  id,
  value,
  onChange,
  autoComplete,
  placeholder,
  invalid,
  autoFocus,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password';
  placeholder?: string;
  invalid?: boolean;
  autoFocus?: boolean;
}) {
  const { tx } = useI18n();
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={shown ? 'text' : 'password'}
        autoComplete={autoComplete}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        autoFocus={autoFocus}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        value={value}
        maxLength={72}
        onChange={(e) => onChange(e.target.value)}
        className={cn(inputClass, 'h-14 pr-14 text-lg', invalid && 'border-danger')}
      />
      <button
        type="button"
        onClick={() => setShown((v) => !v)}
        aria-label={shown ? tx('পাসওয়ার্ড লুকান', 'Hide password') : tx('পাসওয়ার্ড দেখুন', 'Show password')}
        aria-pressed={shown}
        className="absolute right-1.5 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-surface2 hover:text-ink"
      >
        {shown ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
      </button>
    </div>
  );
}
