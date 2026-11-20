import 'server-only';
import webpush from 'web-push';
import { env } from './env';
import type { PushLang, PushMessage } from '@/lib/domain/push';

/** What the service worker receives: the message and the language it was written in. */
export type PushPayload = PushMessage & { lang: PushLang };
export type PushTarget = { endpoint: string; p256dh: string; auth: string };
export type PushOutcome = { ok: true } | { ok: false; gone: boolean; status: number | null; error: string };

/**
 * Sends one push to one browser. A small interface so the rest of the code (and the tests) never touch the push services.
 * `gone` means the push service says the subscription no longer exists (the customer cleared it, or uninstalled): drop it.
 */
export interface PushSender {
  send(target: PushTarget, payload: PushPayload): Promise<PushOutcome>;
}

type Vapid = { subject: string; publicKey: string; privateKey: string };

class WebPushSender implements PushSender {
  constructor(private readonly vapid: Vapid) {}

  async send(target: PushTarget, payload: PushPayload): Promise<PushOutcome> {
    try {
      await webpush.sendNotification({ endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } }, JSON.stringify(payload), {
        vapidDetails: this.vapid,
        // A stamp message is stale within the hour, so a phone that was off does not get it a day later. Messages with the same
        // topic replace each other while they wait, so a phone that was off gets the latest stamp message, not three.
        TTL: 3600,
        topic: payload.tag,
        urgency: 'normal',
        timeout: 8000,
      });
      return { ok: true };
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? null;
      // Never log the endpoint or the keys: whoever has them can send to that browser.
      return { ok: false, gone: status === 404 || status === 410, status, error: (e instanceof Error ? e.message : String(e)).slice(0, 200) };
    }
  }
}

let sender: PushSender | null | undefined;

/** The push sender, or null when web push is not configured (no VAPID keys): the feature is then switched off, not broken. */
export function pushSender(): PushSender | null {
  if (sender !== undefined) return sender;
  const e = env();
  sender = e.VAPID_PUBLIC_KEY && e.VAPID_PRIVATE_KEY && e.VAPID_SUBJECT ? new WebPushSender({ subject: e.VAPID_SUBJECT, publicKey: e.VAPID_PUBLIC_KEY, privateKey: e.VAPID_PRIVATE_KEY }) : null;
  return sender;
}

/** The public half of the VAPID key: the browser needs it to subscribe. It is not secret. */
export const pushPublicKey = (): string | null => env().VAPID_PUBLIC_KEY ?? null;

/** For tests: use this sender (or none) instead of reading the environment. Pass undefined to go back to the environment. */
export function setPushSenderForTests(next: PushSender | null | undefined) {
  sender = next;
}
