'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import type { PushStatusDto } from '@/lib/contracts/dto';
import type { Text } from '@/lib/i18n';
import { disablePush, enablePush, pushSupported, refreshSubscription, subscribedFor } from '../push';
import { api, isApiError } from './client';
import { errorText } from './messages';

const t = (bn: string, en: string): Text => ({ bn, en });

/** What the Profile screen shows for push: `unavailable` hides the row (the server has no push keys), `unsupported` and `denied` explain themselves. */
export type PushState = 'loading' | 'unavailable' | 'unsupported' | 'denied' | 'off' | 'on';

type Local = 'unknown' | 'unsupported' | 'denied' | 'off' | 'on';

/** Turning notifications on and off for this browser, for the signed-in customer. */
export function usePush(customerId: string | undefined) {
  const { data: status, mutate } = useSWR<PushStatusDto>(customerId ? '/api/me/push' : null, { revalidateOnFocus: false });
  const [local, setLocal] = useState<Local>('unknown');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Text | null>(null);
  const [testNote, setTestNote] = useState<Text | null>(null);
  const refreshed = useRef(false);

  // What this browser says: can it, may it, and is it subscribed for this customer.
  useEffect(() => {
    if (!customerId) return;
    let live = true;
    void (async () => {
      if (!pushSupported()) return live && setLocal('unsupported');
      if (Notification.permission === 'denied') return live && setLocal('denied');
      const sub = await subscribedFor(customerId);
      if (!live) return;
      setLocal(sub ? 'on' : 'off');
      // Once per visit, tell the server this subscription is still in use (and give it the browser's latest copy).
      if (sub && !refreshed.current) {
        refreshed.current = true;
        void refreshSubscription(sub).catch(() => undefined);
      }
    })();
    return () => {
      live = false;
    };
  }, [customerId, status?.devices]);

  const enable = useCallback(async () => {
    if (!customerId || !status?.publicKey || busy) return;
    setBusy(true);
    setProblem(null);
    setTestNote(null);
    try {
      setLocal(await enablePush(status.publicKey, customerId));
      await mutate();
    } catch (e) {
      // The browser could not reach its push service (offline, blocked network) or the server refused: say so, stay off.
      setProblem(isApiError(e) ? errorText(e) : t('নোটিফিকেশন চালু করা যায়নি। ইন্টারনেট দেখে আবার চেষ্টা করুন।', 'Could not turn notifications on. Check your connection and try again.'));
      setLocal('off');
    } finally {
      setBusy(false);
    }
  }, [customerId, status?.publicKey, busy, mutate]);

  const disable = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setProblem(null);
    setTestNote(null);
    try {
      await disablePush();
      setLocal('off');
      await mutate();
    } finally {
      setBusy(false);
    }
  }, [busy, mutate]);

  /** Sends a notification to this customer's own devices, to prove the whole chain works. */
  const sendTest = useCallback(async () => {
    setProblem(null);
    setTestNote(null);
    try {
      const r = await api.post<{ sent: number; failed: number; removed: number }>('/api/me/push/test');
      setTestNote(
        r.sent > 0
          ? t('পাঠানো হয়েছে। একটু পরেই আসবে।', 'Sent. It should arrive in a moment.')
          : t('ডিভাইসে পৌঁছানো যায়নি। বন্ধ করে আবার চালু করে দেখুন।', 'Could not reach the device. Try switching notifications off and on again.'),
      );
      await mutate();
    } catch (e) {
      // The test button is throttled to one every few seconds; the general "too many attempts" would sound much worse than it is.
      setProblem(isApiError(e) && e.code === 'RATE_LIMITED' ? t('কয়েক সেকেন্ড অপেক্ষা করে আবার চেষ্টা করুন।', 'Wait a few seconds, then try again.') : errorText(e));
    }
  }, [mutate]);

  const state: PushState = !status ? 'loading' : !status.configured ? 'unavailable' : local === 'unknown' ? 'loading' : local;
  return { state, devices: status?.devices ?? 0, busy, problem, testNote, enable, disable, sendTest };
}
