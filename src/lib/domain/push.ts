/**
 * Web push (notifications on a customer's phone or browser), without any server or browser code: which push-service
 * addresses we accept, and what each message says in each language. The server sends them (src/server/domain/push.ts) and the
 * service worker (public/sw.js) shows them.
 */
import { bnDigits } from '../format';

export type PushLang = 'bn' | 'en';

export type PushMessage = {
  title: string;
  body: string;
  /** A path on this site: where tapping the notification goes. */
  url: string;
  /** A newer message with the same tag replaces the older one on the phone, so a run of stamps does not pile up. */
  tag: 'stamp' | 'reward' | 'test';
};

/**
 * The push services browsers use. The server sends a request to whatever address a customer registers, so an address must be
 * one of these, or a customer could make our server call any internal or outside address (SSRF).
 */
const PUSH_HOSTS = ['fcm.googleapis.com'];
const PUSH_HOST_SUFFIXES = ['.push.services.mozilla.com', '.push.apple.com', '.notify.windows.com'];

export function isAllowedPushEndpoint(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) return false;
  const host = url.hostname.toLowerCase();
  return url.pathname.length > 1 && (PUSH_HOSTS.includes(host) || PUSH_HOST_SUFFIXES.some((s) => host.endsWith(s)));
}

const plural = (n: number, word: string) => (n === 1 ? word : `${word}s`);

/** A stamp (or several) landed on the card. `outlet` is the outlet's name in the customer's language, when known. */
export function stampAddedMessage(i: { lang: PushLang; count: number; stamps: number; total: number; outlet?: string | null }): PushMessage {
  const left = Math.max(0, i.total - i.stamps);
  if (i.lang === 'bn') {
    return {
      title: `${i.outlet ? `${i.outlet}-এ ` : ''}+${bnDigits(String(i.count))}টি Stamp`,
      body: `আপনার ${bnDigits(String(i.stamps))}/${bnDigits(String(i.total))} Stamp হয়েছে। ফ্রি Reward পেতে আর ${bnDigits(String(left))}টি বাকি।`,
      url: '/cards',
      tag: 'stamp',
    };
  }
  return {
    title: `+${i.count} ${plural(i.count, 'stamp')}${i.outlet ? ` at ${i.outlet}` : ''}`,
    body: `You have ${i.stamps}/${i.total}. ${left} more for your free reward.`,
    url: '/cards',
    tag: 'stamp',
  };
}

/** The card is full and a reward voucher is ready. */
export function rewardUnlockedMessage(lang: PushLang): PushMessage {
  return lang === 'bn'
    ? { title: 'Reward আনলক হয়েছে!', body: 'আপনার কার্ড পূর্ণ হয়েছে। যেকোনো আইচা আউটলেটে ভাউচার দেখান।', url: '/rewards', tag: 'reward' }
    : { title: 'Reward unlocked!', body: 'Your card is full. Show your voucher at any AiCha outlet.', url: '/rewards', tag: 'reward' };
}

/** What the "send me a test" button sends. */
export function testMessage(lang: PushLang): PushMessage {
  return lang === 'bn'
    ? { title: 'আইচা নোটিফিকেশন চালু হয়েছে', body: 'Stamp বা Reward পেলে আপনাকে জানানো হবে।', url: '/profile', tag: 'test' }
    : { title: 'AiCha notifications are on', body: 'You will be told when you earn a stamp or a reward.', url: '/profile', tag: 'test' };
}
