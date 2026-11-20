import 'server-only';
import { db } from '../db';
import { fail } from '../errors';
import { log } from '../log';
import { pushSender } from '../push';
import { rewardUnlockedMessage, stampAddedMessage, testMessage, type PushLang, type PushMessage } from '@/lib/domain/push';
import { getProgram } from './program';
import type { StampOutcome } from './stamps';

/**
 * Web push for customers: who agreed (a subscription per browser or phone) and what is sent when. Pushes are best effort and
 * only ever tell the customer something the card already says, so a failed push loses nothing. They are sent after the request
 * that caused them has answered (see afterResponse), never inside its transaction.
 */

/** A customer can have notifications on for this many devices. Past that the one not seen for longest is dropped. */
export const MAX_DEVICES = 5;
/** A subscription that fails this many times in a row is dropped. The push service saying it is gone drops it at once. */
export const DROP_AFTER_FAILURES = 5;
/** Seconds between two "send me a test" presses. */
export const TEST_GAP_SEC = 5;

const languageOf = (language: 'BN' | 'EN'): PushLang => (language === 'BN' ? 'bn' : 'en');

export const countDevices = (customerId: string) => db().pushSubscription.count({ where: { customerId } });

/**
 * The customer turns notifications on for this browser. An address that was registered by someone else on the same browser moves
 * to this customer: whoever holds the address is the one using that browser now.
 */
export async function saveSubscription(input: { customerId: string; endpoint: string; p256dh: string; auth: string; userAgent: string | null; now?: Date }): Promise<void> {
  const now = input.now ?? new Date();
  await db().$transaction(async (tx) => {
    await tx.pushSubscription.upsert({
      where: { endpoint: input.endpoint },
      create: { customerId: input.customerId, endpoint: input.endpoint, p256dh: input.p256dh, auth: input.auth, userAgent: input.userAgent, createdAt: now, lastSeenAt: now },
      update: { customerId: input.customerId, p256dh: input.p256dh, auth: input.auth, userAgent: input.userAgent, lastSeenAt: now, failures: 0 },
    });
    const surplus = await tx.pushSubscription.findMany({
      where: { customerId: input.customerId },
      orderBy: [{ lastSeenAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      skip: MAX_DEVICES,
      select: { id: true },
    });
    if (surplus.length) await tx.pushSubscription.deleteMany({ where: { id: { in: surplus.map((s) => s.id) } } });
  });
}

/**
 * Turn notifications off for one browser. Holding the address is the proof that it is yours, so this does not look at who owns
 * it: signing out, or a new person signing in on a shared phone, must be able to clear the old person's subscription.
 */
export async function removeSubscription(endpoint: string): Promise<void> {
  await db().pushSubscription.deleteMany({ where: { endpoint } });
}

export type PushResult = { sent: number; failed: number; removed: number };

/** Sends one message to every device a customer turned notifications on for, in the language they use. */
export async function pushToCustomer(customerId: string, build: (lang: PushLang) => PushMessage): Promise<PushResult> {
  const none: PushResult = { sent: 0, failed: 0, removed: 0 };
  const sender = pushSender();
  if (!sender) return none;
  const customer = await db().customer.findFirst({
    where: { id: customerId, deletedAt: null },
    select: { language: true, pushNotify: true, pushDevices: { select: { id: true, endpoint: true, p256dh: true, auth: true, failures: true } } },
  });
  // A customer who switched push notifications off in their profile gets none, even if a device is still registered.
  if (!customer || !customer.pushNotify || customer.pushDevices.length === 0) return none;

  const lang = languageOf(customer.language);
  const payload = { ...build(lang), lang };
  const results = await Promise.all(customer.pushDevices.map(async (device) => ({ device, outcome: await sender.send(device, payload) })));

  const total: PushResult = { ...none };
  for (const { device, outcome } of results) {
    if (outcome.ok) {
      total.sent += 1;
      await db().pushSubscription.update({ where: { id: device.id }, data: { lastPushAt: new Date(), failures: 0 } }).catch(() => undefined);
      continue;
    }
    log.warn('push.failed', { status: outcome.status, gone: outcome.gone, error: outcome.error });
    if (outcome.gone || device.failures + 1 >= DROP_AFTER_FAILURES) {
      total.removed += 1;
      await db().pushSubscription.deleteMany({ where: { id: device.id } });
    } else {
      total.failed += 1;
      await db().pushSubscription.update({ where: { id: device.id }, data: { failures: { increment: 1 } } }).catch(() => undefined);
    }
  }
  return total;
}

/**
 * After stamps landed on a card at the counter or by a manager. A stamp that fills the card says "Reward unlocked" instead of the
 * stamp count. A retry that returned the first answer again (replayed) says nothing a second time, and neither does taking stamps away.
 */
export async function notifyStamps(outcome: Pick<StampOutcome, 'entry' | 'card' | 'completed' | 'replayed'>, source: 'counter' | 'adjust'): Promise<void> {
  if (outcome.replayed) return;
  const { entry, card } = outcome;
  if (outcome.completed > 0) {
    await pushToCustomer(entry.customerId, rewardUnlockedMessage);
    return;
  }
  if (entry.count <= 0) return;
  const [program, branch] = await Promise.all([
    getProgram(db()),
    source === 'counter' && entry.branchId ? db().branch.findUnique({ where: { id: entry.branchId }, select: { nameBn: true, nameEn: true } }) : null,
  ]);
  await pushToCustomer(entry.customerId, (lang) =>
    stampAddedMessage({ lang, count: entry.count, stamps: card.stamps, total: program.stampsRequired, outlet: branch ? (lang === 'bn' ? branch.nameBn : branch.nameEn) : null }),
  );
}

/** Customers whose card just filled without a stamp (the owner made the card smaller): each hears about the reward. */
export async function notifyRewardsUnlocked(customerIds: string[]): Promise<void> {
  const queue = [...new Set(customerIds)];
  // A few at a time, so a big change does not open hundreds of connections at once.
  await Promise.all(
    Array.from({ length: Math.min(5, queue.length) }, async () => {
      for (let id = queue.pop(); id; id = queue.pop()) await pushToCustomer(id, rewardUnlockedMessage).catch((e) => log.warn('push.reward_failed', { error: String(e).slice(0, 200) }));
    }),
  );
}

/** "Send me a test" on the Profile screen: proves that the whole chain works on this customer's devices. */
export async function sendTest(customerId: string): Promise<PushResult> {
  if (!pushSender()) throw fail.conflict('PUSH_NOT_CONFIGURED', 'Push notifications are not switched on');
  if ((await countDevices(customerId)) === 0) throw fail.conflict('PUSH_NO_DEVICE', 'No device has notifications on for this account');
  // Every push notes when it last got through, so a second test within a few seconds is refused: this is a button, not a way to ring a phone.
  const recent = await db().pushSubscription.count({ where: { customerId, lastPushAt: { gt: new Date(Date.now() - TEST_GAP_SEC * 1000) } } });
  if (recent > 0) throw fail.rateLimited('RATE_LIMITED', TEST_GAP_SEC, 'Wait a few seconds before sending another test');
  return pushToCustomer(customerId, testMessage);
}
