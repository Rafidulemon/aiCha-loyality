'use client';

import { useEffect, useRef } from 'react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/cn';

const LENGTH = 6;

/**
 * Six boxes for a one-time code.
 * - Typing moves on; the moment the sixth digit is in, `onComplete` runs with the whole code, so the screen can check it.
 * - Backspace clears the box you are in, or, when it is already empty, steps back and clears the one before it, so a code can be
 *   deleted from the keyboard without touching each box. Delete, the arrow keys and Home/End work too.
 * - A pasted or auto-filled code spreads over the boxes.
 * - Green outline while the code is being entered and while it is checked; red (with a small shake) when `error` is set.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  error,
  checking = false,
  disabled = false,
  autoFocus = true,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  /** Called once all six digits are in. */
  onComplete?: (code: string) => void;
  error?: string;
  /** The code is being checked: keep the boxes green and still. */
  checking?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const { tx, n } = useI18n();
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const failed = Boolean(error);

  useEffect(() => {
    if (autoFocus) boxes.current[0]?.focus();
  }, [autoFocus]);

  // After a wrong code, put the cursor back on the last box so one Backspace starts the correction.
  useEffect(() => {
    if (failed) boxes.current[LENGTH - 1]?.focus();
  }, [failed]);

  const focus = (i: number) => {
    const box = boxes.current[Math.max(0, Math.min(LENGTH - 1, i))];
    box?.focus();
    box?.select();
  };

  const commit = (next: string[], focusAt: number) => {
    onChange(next);
    if (next.every(Boolean)) {
      onComplete?.(next.join(''));
      boxes.current[LENGTH - 1]?.blur();
    } else {
      focus(focusAt);
    }
  };

  const spread = (from: number, raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, LENGTH - from);
    if (!digits) return;
    const next = [...value];
    digits.split('').forEach((d, k) => {
      next[from + k] = d;
    });
    // A code that starts in the first box replaces what was there; one typed from a later box keeps the earlier digits.
    commit(next, from + digits.length);
  };

  const onType = (i: number, raw: string) => {
    let digits = raw.replace(/\D/g, '');
    // A whole code in one go (auto-fill from an SMS or a keyboard suggestion) fills from the first box.
    if (digits.length >= LENGTH) return spread(0, digits);
    // Typing into a box that already holds a digit leaves two characters: keep the new one.
    if (digits.length === 2 && value[i] && digits.includes(value[i])) digits = digits.replace(value[i], '');
    // Anything longer is several digits inserted at once: they fill from this box on.
    if (digits.length > 1) return spread(i, digits);
    if (!digits) {
      // The box was emptied (some mobile keyboards report Backspace only through this event).
      const next = [...value];
      next[i] = '';
      onChange(next);
      return;
    }
    const next = [...value];
    next[i] = digits;
    commit(next, i + 1);
  };

  const onKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'Backspace': {
        e.preventDefault();
        const next = [...value];
        if (next[i]) {
          next[i] = '';
          onChange(next);
        } else if (i > 0) {
          next[i - 1] = '';
          onChange(next);
          focus(i - 1);
        }
        break;
      }
      case 'Delete': {
        e.preventDefault();
        const next = [...value];
        next[i] = '';
        onChange(next);
        break;
      }
      case 'ArrowLeft':
        e.preventDefault();
        focus(i - 1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        focus(i + 1);
        break;
      case 'Home':
        e.preventDefault();
        focus(0);
        break;
      case 'End':
        e.preventDefault();
        focus(LENGTH - 1);
        break;
    }
  };

  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="sr-only">{tx('OTP কোড', 'One-time code')}</legend>
      <div className={cn('grid grid-cols-6 gap-2 sm:gap-3', failed && 'motion-safe:animate-otp-shake')}>
        {value.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              boxes.current[i] = el;
            }}
            aria-label={tx(`সংখ্যা ${n(i + 1)}`, `Digit ${i + 1}`)}
            aria-invalid={failed || undefined}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            value={d}
            onChange={(e) => onType(i, e.target.value)}
            onKeyDown={(e) => onKey(i, e)}
            onFocus={(e) => e.target.select()}
            onPaste={(e) => {
              e.preventDefault();
              spread(0, e.clipboardData.getData('text'));
            }}
            className={cn(
              'h-14 min-w-0 rounded-[14px] border-2 bg-surface text-center text-2xl font-bold outline-none transition-colors duration-150 sm:h-16',
              // The colours are theme variables, so mix them with transparency by hand (Tailwind cannot on a plain var()).
              failed
                ? 'border-danger bg-danger-soft text-danger focus:ring-4 focus:ring-[color-mix(in_srgb,var(--danger)_22%,transparent)]'
                : d || checking
                  ? 'border-ok bg-[color-mix(in_srgb,var(--ok)_10%,transparent)] text-ink focus:ring-4 focus:ring-[color-mix(in_srgb,var(--ok)_18%,transparent)]'
                  : 'border-line2 focus:border-ok focus:ring-4 focus:ring-[color-mix(in_srgb,var(--ok)_18%,transparent)]',
            )}
          />
        ))}
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-[13px] font-semibold text-danger">{error}</p>
      ) : (
        checking && <p role="status" className="mt-2 text-[13px] font-semibold text-ok">{tx('যাচাই হচ্ছে…', 'Checking…')}</p>
      )}
    </fieldset>
  );
}
