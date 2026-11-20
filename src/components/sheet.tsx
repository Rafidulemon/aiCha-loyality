'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/cn';

const DURATION = 320;

/**
 * A bottom sheet: it slides up over a dimmed backdrop and slides back down when closed (backdrop tap, close button, Escape or
 * a downward swipe on the handle). On wide screens it is a centred panel that rises the same way. The page behind does not scroll.
 */
export function Sheet({ open, onClose, title, subtitle, children }: { open: boolean; onClose: () => void; title: ReactNode; subtitle?: ReactNode; children: ReactNode }) {
  const { tx } = useI18n();
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const drag = useRef<{ y: number } | null>(null);
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  const [offset, setOffset] = useState(0);

  // Mount first, then flip `shown` on the next frame so the browser has a starting position to animate from.
  useEffect(() => {
    if (open) {
      opener.current = document.activeElement as HTMLElement | null;
      setMounted(true);
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      return () => cancelAnimationFrame(id);
    }
    setShown(false);
    const id = setTimeout(() => {
      setMounted(false);
      setOffset(0);
      opener.current?.focus?.();
    }, DURATION);
    return () => clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mounted]);

  useEffect(() => {
    if (!shown) return;
    panel.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab' || !panel.current) return;
      const items = [...panel.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])')];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [shown, onClose]);

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="presentation">
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn('absolute inset-0 bg-[#120e0c]/55 backdrop-blur-[3px] transition-opacity ease-out', shown ? 'opacity-100' : 'opacity-0')}
        style={{ transitionDuration: `${DURATION}ms` }}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[32px] border border-line bg-surface shadow-[0_-24px_60px_-20px_rgba(0,0,0,0.45)] outline-none sm:max-w-[520px] sm:rounded-[32px]',
          offset === 0 && 'transition-[transform,opacity] ease-[cubic-bezier(0.22,1,0.36,1)]',
          shown ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 sm:translate-y-10',
        )}
        style={{ transitionDuration: `${DURATION}ms`, ...(shown && offset ? { transform: `translateY(${offset}px)` } : {}) }}
      >
        <div
          className="flex shrink-0 touch-none justify-center pb-1 pt-3 sm:hidden"
          onPointerDown={(e) => {
            drag.current = { y: e.clientY };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => drag.current && setOffset(Math.max(0, e.clientY - drag.current.y))}
          onPointerUp={() => {
            const moved = offset;
            drag.current = null;
            setOffset(0);
            if (moved > 90) onClose();
          }}
          onPointerCancel={() => {
            drag.current = null;
            setOffset(0);
          }}
        >
          <span aria-hidden="true" className="h-1.5 w-11 rounded-full bg-line2" />
        </div>
        <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-3 pt-2 sm:pt-5">
          <div className="min-w-0">
            <h2 id={titleId} className="font-display text-[22px] font-extrabold leading-tight">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label={tx('বন্ধ করুন', 'Close')} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface2 text-muted hover:text-ink">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 pb-[max(20px,env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
