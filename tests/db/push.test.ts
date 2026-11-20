import { randomBytes, randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { closeDb, db } from '@/server/db';
import { createCustomer, eraseCustomer } from '@/server/domain/customers';
import { verifyLedger } from '@/server/domain/invariants';
import {
  DROP_AFTER_FAILURES,
  MAX_DEVICES,
  TEST_GAP_SEC,
  countDevices,
  notifyRewardsUnlocked,
  notifyStamps,
  pushToCustomer,
  removeSubscription,
  saveSubscription,
  sendTest,
} from '@/server/domain/push';
import { adjustStamps, addStampsAtCounter } from '@/server/domain/stamps';
import { setPushSenderForTests, type PushOutcome, type PushPayload, type PushSender, type PushTarget } from '@/server/push';
import { rewardUnlockedMessage } from '@/lib/domain/push';
import { actorOf, makeBranch, makeCustomer, makeStaff, resetProgram, setProgram, uniquePhone } from './helpers';

/** A push sender that remembers what it was asked to send and answers as the test says. */
function fakeSender(answer: (target: PushTarget) => PushOutcome = () => ({ ok: true })) {
  const calls: { target: PushTarget; payload: PushPayload }[] = [];
  const sender: PushSender = {
    async send(target, payload) {
      calls.push({ target, payload });
      return answer(target);
    },
  };
  return { sender, calls };
}

const endpoint = () => `https://fcm.googleapis.com/fcm/send/${randomUUID()}`;
const device = (customerId: string, url = endpoint()) =>
  saveSubscription({ customerId, endpoint: url, p256dh: randomBytes(65).toString('base64url'), auth: randomBytes(16).toString('base64url'), userAgent: 'test browser' }).then(() => url);
const ctx = () => ({ requestId: randomUUID(), actor: { type: 'SYSTEM' as const, id: null } });

let branch: Awaited<ReturnType<typeof makeBranch>>;
let cashier: Awaited<ReturnType<typeof makeStaff>>;
let manager: Awaited<ReturnType<typeof makeStaff>>;

beforeAll(async () => {
  branch = await makeBranch('Push');
  cashier = await makeStaff('CASHIER', [branch.id]);
  manager = await makeStaff('MANAGER', [branch.id]);
});
beforeEach(() => setPushSenderForTests(null));
afterEach(async () => {
  setPushSenderForTests(undefined);
  await resetProgram();
});
afterAll(async () => {
  expect(await verifyLedger(db())).toEqual([]);
  await closeDb();
});

describe('subscriptions', () => {
  it('stores a device, and saving the same one again only refreshes it', async () => {
    const c = await makeCustomer();
    const url = await device(c.id);
    await db().pushSubscription.update({ where: { endpoint: url }, data: { failures: 3 } });
    await saveSubscription({ customerId: c.id, endpoint: url, p256dh: 'new-key', auth: 'new-auth', userAgent: 'again' });
    expect(await countDevices(c.id)).toBe(1);
    expect(await db().pushSubscription.findUniqueOrThrow({ where: { endpoint: url } })).toMatchObject({ p256dh: 'new-key', auth: 'new-auth', userAgent: 'again', failures: 0 });
  });

  it('moves a browser to the person who subscribes on it now', async () => {
    const [a, b] = [await makeCustomer(), await makeCustomer()];
    const url = await device(a.id);
    await device(b.id, url);
    expect(await countDevices(a.id)).toBe(0);
    expect(await countDevices(b.id)).toBe(1);
  });

  it('turns a browser off by its address, whoever it was registered to (a new person on a shared phone can clear the old one)', async () => {
    const a = await makeCustomer();
    const url = await device(a.id);
    await removeSubscription(url);
    await removeSubscription(url); // already gone: nothing to do, not an error
    expect(await countDevices(a.id)).toBe(0);
  });

  it(`keeps at most ${MAX_DEVICES} devices per customer, dropping the one not seen for longest`, async () => {
    const c = await makeCustomer();
    const first = await device(c.id);
    for (let i = 1; i < MAX_DEVICES; i++) await device(c.id);
    expect(await countDevices(c.id)).toBe(MAX_DEVICES);
    const sixth = await device(c.id);
    expect(await countDevices(c.id)).toBe(MAX_DEVICES);
    expect(await db().pushSubscription.count({ where: { endpoint: first } })).toBe(0);
    expect(await db().pushSubscription.count({ where: { endpoint: sixth } })).toBe(1);
  });

  it('is removed with the customer when they erase their account', async () => {
    const c = await makeCustomer();
    await device(c.id);
    await db().$transaction((tx) => eraseCustomer(tx, c.id, ctx()));
    expect(await countDevices(c.id)).toBe(0);
  });

  it('cannot hold a negative failure count (the database refuses it)', async () => {
    const c = await makeCustomer();
    const url = await device(c.id);
    await expect(db().$executeRaw`UPDATE "PushSubscription" SET "failures" = -1 WHERE "endpoint" = ${url}`).rejects.toThrow(/push_failures_not_negative/);
  });
});

describe('sending to a customer', () => {
  it('does nothing, and changes nothing, when push is not switched on', async () => {
    const c = await makeCustomer();
    const url = await device(c.id);
    setPushSenderForTests(null);
    expect(await pushToCustomer(c.id, rewardUnlockedMessage)).toEqual({ sent: 0, failed: 0, removed: 0 });
    expect((await db().pushSubscription.findUniqueOrThrow({ where: { endpoint: url } })).lastPushAt).toBeNull();
  });

  it('sends to every device in the language the customer uses, and notes when it last got through', async () => {
    const { sender, calls } = fakeSender();
    setPushSenderForTests(sender);
    const bn = await makeCustomer();
    await db().customer.update({ where: { id: bn.id }, data: { language: 'BN' } });
    const [u1, u2] = [await device(bn.id), await device(bn.id)];
    const en = await makeCustomer();
    await device(en.id);

    expect(await pushToCustomer(bn.id, rewardUnlockedMessage)).toEqual({ sent: 2, failed: 0, removed: 0 });
    expect(calls).toHaveLength(2); // the other customer's device was not touched
    expect(calls.map((c) => c.target.endpoint).sort()).toEqual([u1, u2].sort());
    expect(calls[0].payload).toMatchObject({ lang: 'bn', tag: 'reward', url: '/rewards' });
    expect(calls[0].payload.title).toMatch(/[অ-হ]/);
    expect((await db().pushSubscription.findUniqueOrThrow({ where: { endpoint: u1 } })).lastPushAt).not.toBeNull();
  });

  it('drops a device the push service says is gone, and keeps counting failures of one that only fails', async () => {
    const gone = await makeCustomer();
    const goneUrl = await device(gone.id);
    setPushSenderForTests(fakeSender(() => ({ ok: false, gone: true, status: 410, error: 'Gone' })).sender);
    expect(await pushToCustomer(gone.id, rewardUnlockedMessage)).toEqual({ sent: 0, failed: 0, removed: 1 });
    expect(await db().pushSubscription.count({ where: { endpoint: goneUrl } })).toBe(0);

    const flaky = await makeCustomer();
    const flakyUrl = await device(flaky.id);
    setPushSenderForTests(fakeSender(() => ({ ok: false, gone: false, status: 503, error: 'Unavailable' })).sender);
    for (let i = 1; i < DROP_AFTER_FAILURES; i++) {
      expect(await pushToCustomer(flaky.id, rewardUnlockedMessage)).toEqual({ sent: 0, failed: 1, removed: 0 });
      expect((await db().pushSubscription.findUniqueOrThrow({ where: { endpoint: flakyUrl } })).failures).toBe(i);
    }
    expect(await pushToCustomer(flaky.id, rewardUnlockedMessage)).toEqual({ sent: 0, failed: 0, removed: 1 }); // the last straw
    expect(await db().pushSubscription.count({ where: { endpoint: flakyUrl } })).toBe(0);
  });

  it('forgets earlier failures after one send gets through', async () => {
    const c = await makeCustomer();
    const url = await device(c.id);
    await db().pushSubscription.update({ where: { endpoint: url }, data: { failures: 4 } });
    setPushSenderForTests(fakeSender().sender);
    await pushToCustomer(c.id, rewardUnlockedMessage);
    expect((await db().pushSubscription.findUniqueOrThrow({ where: { endpoint: url } })).failures).toBe(0);
  });

  it('sends nothing to a customer who erased their account', async () => {
    const { sender, calls } = fakeSender();
    setPushSenderForTests(sender);
    const c = await makeCustomer();
    await device(c.id);
    await db().customer.update({ where: { id: c.id }, data: { deletedAt: new Date() } });
    expect(await pushToCustomer(c.id, rewardUnlockedMessage)).toEqual({ sent: 0, failed: 0, removed: 0 });
    expect(calls).toHaveLength(0);
  });
});

describe('what is sent when stamps land (CU notifications)', () => {
  const actor = () => actorOf(cashier, branch.id);

  it('a stamp at the counter says how many, where, and how many are left', async () => {
    const { sender, calls } = fakeSender();
    setPushSenderForTests(sender);
    await setProgram({ stampsRequired: 10, dailyLimit: 0 });
    const c = await makeCustomer(); // starts with the welcome stamp
    await device(c.id);
    const outcome = await addStampsAtCounter({ customerId: c.id, count: 2, idempotencyKey: randomUUID(), actor: actor() });

    await notifyStamps(outcome, 'counter');
    expect(calls).toHaveLength(1);
    expect(calls[0].payload).toMatchObject({ lang: 'en', tag: 'stamp', url: '/cards', title: `+2 stamps at ${branch.nameEn}`, body: 'You have 3/10. 7 more for your free reward.' });
  });

  it('a stamp that fills the card says "Reward unlocked" instead, once', async () => {
    const { sender, calls } = fakeSender();
    setPushSenderForTests(sender);
    await setProgram({ stampsRequired: 4, dailyLimit: 0 });
    const c = await makeCustomer();
    await device(c.id);
    const outcome = await addStampsAtCounter({ customerId: c.id, count: 3, idempotencyKey: randomUUID(), actor: actor() });
    expect(outcome.completed).toBe(1);

    await notifyStamps(outcome, 'counter');
    expect(calls).toHaveLength(1);
    expect(calls[0].payload).toMatchObject({ tag: 'reward', title: 'Reward unlocked!', url: '/rewards' });
  });

  it('a retry that returns the first answer again says nothing a second time', async () => {
    const { sender, calls } = fakeSender();
    setPushSenderForTests(sender);
    await setProgram({ dailyLimit: 0 });
    const c = await makeCustomer();
    await device(c.id);
    const key = randomUUID();
    const first = await addStampsAtCounter({ customerId: c.id, count: 1, idempotencyKey: key, actor: actor() });
    const retry = await addStampsAtCounter({ customerId: c.id, count: 1, idempotencyKey: key, actor: actor() });
    expect([first.replayed, retry.replayed]).toEqual([false, true]);

    await notifyStamps(first, 'counter');
    await notifyStamps(retry, 'counter');
    expect(calls).toHaveLength(1);
  });

  it('stamps added by hand say so without an outlet, and taking stamps away says nothing', async () => {
    const { sender, calls } = fakeSender();
    setPushSenderForTests(sender);
    const c = await makeCustomer();
    await device(c.id);
    const adj = (delta: number) => adjustStamps({ customerId: c.id, delta, reason: 'test', actor: actorOf(manager, null), ctx: ctx() });

    await notifyStamps(await adj(2), 'adjust');
    expect(calls).toHaveLength(1);
    expect(calls[0].payload.title).toBe('+2 stamps');
    await notifyStamps(await adj(-1), 'adjust');
    expect(calls).toHaveLength(1);
  });

  it('tells customers whose card a smaller program just filled, and only those with a device', async () => {
    const { sender, calls } = fakeSender();
    setPushSenderForTests(sender);
    const [a, b, noDevice] = [await makeCustomer(), await makeCustomer(), await makeCustomer()];
    await device(a.id);
    await device(b.id);
    await notifyRewardsUnlocked([a.id, b.id, noDevice.id, a.id]); // a listed twice is told once
    expect(calls).toHaveLength(2);
    expect(calls.every((c) => c.payload.tag === 'reward')).toBe(true);
  });
});

describe('"send me a test"', () => {
  it('says so when push is off, or when the customer has no device', async () => {
    const c = await makeCustomer();
    await expect(sendTest(c.id)).rejects.toMatchObject({ code: 'PUSH_NOT_CONFIGURED' });
    setPushSenderForTests(fakeSender().sender);
    await expect(sendTest(c.id)).rejects.toMatchObject({ code: 'PUSH_NO_DEVICE' });
  });

  it('sends the test message to the customer\'s own devices', async () => {
    const { sender, calls } = fakeSender();
    setPushSenderForTests(sender);
    const c = await makeCustomer();
    await device(c.id);
    expect(await sendTest(c.id)).toEqual({ sent: 1, failed: 0, removed: 0 });
    expect(calls[0].payload).toMatchObject({ tag: 'test', url: '/profile' });
  });

  it('refuses a second test a moment later, so the button cannot be used to ring a phone over and over', async () => {
    const { sender, calls } = fakeSender();
    setPushSenderForTests(sender);
    const c = await makeCustomer();
    await device(c.id);
    await sendTest(c.id);
    await expect(sendTest(c.id)).rejects.toMatchObject({ code: 'RATE_LIMITED', status: 429, retryAfter: TEST_GAP_SEC });
    expect(calls).toHaveLength(1);
  });
});

describe('a counter-made customer has no devices until they sign in themselves', () => {
  it('so a stamp for them sends nothing and costs nothing', async () => {
    const { sender, calls } = fakeSender();
    setPushSenderForTests(sender);
    const made = await db().$transaction((tx) => createCustomer(tx, { phone: uniquePhone(), name: 'Counter Customer', joinedVia: 'COUNTER' }));
    const outcome = await addStampsAtCounter({ customerId: made.customer.id, count: 1, idempotencyKey: randomUUID(), actor: actorOf(cashier, branch.id) });
    await notifyStamps(outcome, 'counter');
    expect(calls).toHaveLength(0);
  });
});
