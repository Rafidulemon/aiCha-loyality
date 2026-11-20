/**
 * Browser side of web push: turning notifications on and off for this browser. Plain functions, no React (the Profile screen's
 * hook is in src/lib/api/push.ts). The service worker that shows the notifications is public/sw.js.
 *
 * A subscription belongs to whoever turned it on. This browser remembers who in localStorage, so a browser that someone else
 * subscribed (a shared phone, a sign-in that ran out) is cleared the next time a different customer opens the app.
 */
import { api } from './api/client';

const OWNER_KEY = 'aicha-push-owner';

/** Whether this browser can do web push at all. (An iPhone can only when the app was added to the Home Screen.) */
export function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/** The server key as the bytes the browser wants (it is sent as base64url text). */
function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const padded = base64url.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob(padded);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function registerWorker(): Promise<ServiceWorkerRegistration> {
  await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  return navigator.serviceWorker.ready;
}

/** This browser's push subscription, or null. */
export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration('/');
  return registration ? registration.pushManager.getSubscription() : null;
}

const ownerOf = () => {
  try {
    return localStorage.getItem(OWNER_KEY);
  } catch {
    return null;
  }
};
const setOwner = (customerId: string | null) => {
  try {
    if (customerId) localStorage.setItem(OWNER_KEY, customerId);
    else localStorage.removeItem(OWNER_KEY);
  } catch {
    /* private mode: the subscription still works, it just cannot be traced to a person later */
  }
};

/** True when this browser is subscribed and the customer who is signed in is the one who subscribed it. */
export async function subscribedFor(customerId: string): Promise<PushSubscription | null> {
  const sub = Notification.permission === 'granted' ? await currentSubscription() : null;
  return sub && ownerOf() === customerId ? sub : null;
}

/**
 * Turns notifications on for this browser. Must run from a click: the browser only shows its permission question then.
 * Returns 'denied' when the person said no (or the browser blocks it), 'off' when they closed the question without answering,
 * and 'on' when it worked.
 */
export async function enablePush(publicKey: string, customerId: string): Promise<'on' | 'off' | 'denied'> {
  const permission = await Notification.requestPermission();
  if (permission === 'denied') return 'denied';
  if (permission !== 'granted') return 'off';
  const registration = await registerWorker();
  const subscription =
    (await registration.pushManager.getSubscription()) ?? (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
  await api.put('/api/me/push', subscription.toJSON());
  setOwner(customerId);
  return 'on';
}

/** Tells the server this browser should stop getting notifications, then drops the subscription in the browser. */
export async function disablePush(): Promise<void> {
  setOwner(null);
  const subscription = await currentSubscription();
  if (!subscription) return;
  await api.post('/api/me/push/unsubscribe', { endpoint: subscription.endpoint }).catch(() => undefined);
  await subscription.unsubscribe().catch(() => undefined);
}

/** Keeps the server's copy of this browser's subscription fresh (the push service can change it, and it also shows it is still in use). */
export async function refreshSubscription(subscription: PushSubscription): Promise<void> {
  await api.put('/api/me/push', subscription.toJSON());
}

/**
 * Run when the app opens for a signed-in customer: if this browser holds a subscription that someone else turned on, clear it, so
 * one person's stamps are never shown on another person's phone.
 */
export async function dropForeignSubscription(customerId: string): Promise<void> {
  if (!pushSupported() || Notification.permission !== 'granted') return;
  const subscription = await currentSubscription();
  if (subscription && ownerOf() !== customerId) await disablePush();
}
