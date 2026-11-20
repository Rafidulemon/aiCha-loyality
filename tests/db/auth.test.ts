import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// next/headers only works inside a request, so give the session code an in-memory cookie jar.
const jar = vi.hoisted(() => new Map<string, string>());
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string, opts?: { maxAge?: number }) => {
      if (!value || opts?.maxAge === 0) jar.delete(name);
      else jar.set(name, value);
    },
  }),
}));

import {
  confirmPasswordReset,
  loginWithPassword,
  registerCustomer,
  requestPasswordReset,
  requestRegistrationCode,
  resetPassword,
  setFirstPassword,
} from '@/server/auth/customer';
import { consumeOtp, issueOtp, OTP_RESEND_SEC, OTP_TTL_SEC } from '@/server/auth/otp';
import { endSession, readCustomerSession, readStaffSession, revokeAllSessions } from '@/server/auth/session';
import { approveOverride, completeStaffLogin, loginWithPin, resolveBranch } from '@/server/auth/staff';
import { closeDb, db } from '@/server/db';
import { actorOf, cardOf, makeBranch, makeStaff, uniquePhone } from './helpers';

const CODE = '135792'; // DEV_OTP_CODE in vitest.config.mts (fixed OTP mode)
const PIN = '246810';
const meta = { ipHash: 'test-ip', userAgent: 'vitest' };
const sec = (s: number) => new Date(Date.now() + s * 1000);

let branch: Awaited<ReturnType<typeof makeBranch>>;
let other: Awaited<ReturnType<typeof makeBranch>>;

beforeAll(async () => {
  branch = await makeBranch('Auth');
  other = await makeBranch('Auth other');
});
beforeEach(() => jar.clear());
afterAll(() => closeDb());

describe('one-time codes (BR-16, NF-06)', () => {
  it('issues a code that works once', async () => {
    const phone = uniquePhone();
    const { challengeId, expiresInSec } = await issueOtp({ purpose: 'CUSTOMER_LOGIN', phone, ipHash: null });
    expect(expiresInSec).toBe(OTP_TTL_SEC);
    await expect(consumeOtp({ purpose: 'CUSTOMER_LOGIN', challengeId, code: CODE })).resolves.toMatchObject({ phone });
    await expect(consumeOtp({ purpose: 'CUSTOMER_LOGIN', challengeId, code: CODE })).rejects.toMatchObject({ code: 'OTP_INVALID' });
  });

  it('refuses a wrong code and stores no plain code', async () => {
    const { challengeId } = await issueOtp({ purpose: 'CUSTOMER_LOGIN', phone: uniquePhone(), ipHash: null });
    await expect(consumeOtp({ purpose: 'CUSTOMER_LOGIN', challengeId, code: '000000' })).rejects.toMatchObject({ code: 'OTP_INVALID' });
    const row = await db().otpChallenge.findUniqueOrThrow({ where: { id: challengeId } });
    expect(row.attempts).toBe(1);
    expect(row.codeHash).toMatch(/^[0-9a-f]{64}$/); // a keyed hash, never the code itself
  });

  it('burns the challenge after five wrong codes, even for the right code afterwards', async () => {
    const { challengeId } = await issueOtp({ purpose: 'CUSTOMER_LOGIN', phone: uniquePhone(), ipHash: null });
    for (let i = 0; i < 5; i++) await expect(consumeOtp({ purpose: 'CUSTOMER_LOGIN', challengeId, code: '111111' })).rejects.toMatchObject({ code: 'OTP_INVALID' });
    await expect(consumeOtp({ purpose: 'CUSTOMER_LOGIN', challengeId, code: CODE })).rejects.toMatchObject({ code: 'OTP_TOO_MANY_ATTEMPTS' });
    await expect(consumeOtp({ purpose: 'CUSTOMER_LOGIN', challengeId, code: CODE })).rejects.toMatchObject({ code: 'OTP_INVALID' });
  });

  it('expires after five minutes', async () => {
    const { challengeId } = await issueOtp({ purpose: 'CUSTOMER_LOGIN', phone: uniquePhone(), ipHash: null });
    await expect(consumeOtp({ purpose: 'CUSTOMER_LOGIN', challengeId, code: CODE, now: sec(OTP_TTL_SEC + 5) })).rejects.toMatchObject({ code: 'OTP_INVALID' });
  });

  it('cannot be used for a different purpose, and unknown ids look the same as wrong codes', async () => {
    const { challengeId } = await issueOtp({ purpose: 'CUSTOMER_LOGIN', phone: uniquePhone(), ipHash: null });
    await expect(consumeOtp({ purpose: 'STAFF_LOGIN', challengeId, code: CODE })).rejects.toMatchObject({ code: 'OTP_INVALID' });
    await expect(consumeOtp({ purpose: 'CUSTOMER_LOGIN', challengeId: '00000000-0000-4000-8000-000000000000', code: CODE })).rejects.toMatchObject({ code: 'OTP_INVALID' });
  });

  it('allows one code every 30 seconds and five an hour per phone', async () => {
    const phone = uniquePhone();
    const start = Date.now();
    await issueOtp({ purpose: 'CUSTOMER_LOGIN', phone, ipHash: null, now: new Date(start) });
    await expect(issueOtp({ purpose: 'CUSTOMER_LOGIN', phone, ipHash: null, now: new Date(start + 10_000) })).rejects.toMatchObject({ code: 'OTP_RATE_LIMITED', retryAfter: OTP_RESEND_SEC - 10 });
    for (let i = 1; i < 5; i++) await issueOtp({ purpose: 'CUSTOMER_LOGIN', phone, ipHash: null, now: new Date(start + i * 31_000) });
    await expect(issueOtp({ purpose: 'CUSTOMER_LOGIN', phone, ipHash: null, now: new Date(start + 6 * 31_000) })).rejects.toMatchObject({ code: 'OTP_RATE_LIMITED' });
  });

  it('limits one network address to twenty codes an hour', async () => {
    const start = Date.now();
    const ipHash = `ip-${start}`;
    for (let i = 0; i < 20; i++) await issueOtp({ purpose: 'CUSTOMER_LOGIN', phone: uniquePhone(), ipHash, now: new Date(start + i) });
    await expect(issueOtp({ purpose: 'CUSTOMER_LOGIN', phone: uniquePhone(), ipHash, now: new Date(start + 100) })).rejects.toMatchObject({ code: 'OTP_RATE_LIMITED' });
  });
});

describe('customer accounts: registration, one-time password, own password (CU-01, BR-16, BR-17)', () => {
  const PASSWORD = 'tea-and-ice-cream-42';
  let cashier: Awaited<ReturnType<typeof makeStaff>>;
  beforeAll(async () => {
    cashier = await makeStaff('CASHIER', [branch.id], { pin: PIN });
  });

  /** Staff register a customer the way the screens do: a code to the customer's phone, then the registration. */
  async function register(name = 'Registered Customer') {
    const phone = uniquePhone();
    const { challengeId } = await requestRegistrationCode({ phone, ipHash: null });
    const result = await registerCustomer({ challengeId, code: CODE, phone, name, joinedVia: 'COUNTER', staffId: cashier.id, branchId: branch.id });
    return { phone, customerId: result.customer.id };
  }

  it('registers a customer with the welcome stamp, and no password yet', async () => {
    const { phone, customerId } = await register();
    expect((await cardOf(customerId)).stamps).toBe(1);
    expect(await db().customer.findUniqueOrThrow({ where: { id: customerId } })).toMatchObject({ phone, joinedVia: 'COUNTER', createdById: cashier.id, passwordHash: null, name: 'Registered Customer' });
  });

  it('refuses a number that already has a card, and a code that was sent to another number', async () => {
    const { phone } = await register();
    await expect(requestRegistrationCode({ phone, ipHash: null })).rejects.toMatchObject({ code: 'PHONE_TAKEN' });

    const other = uniquePhone();
    const { challengeId } = await requestRegistrationCode({ phone: other, ipHash: null });
    await expect(registerCustomer({ challengeId, code: CODE, phone: uniquePhone(), name: 'Someone', joinedVia: 'COUNTER', staffId: cashier.id, branchId: branch.id })).rejects.toMatchObject({ code: 'OTP_INVALID' });
    expect(await db().customer.count({ where: { phone: other } })).toBe(0);
  });

  it('does not register with a wrong code', async () => {
    const phone = uniquePhone();
    const { challengeId } = await requestRegistrationCode({ phone, ipHash: null });
    await expect(registerCustomer({ challengeId, code: '999999', phone, name: 'Nobody', joinedVia: 'COUNTER', staffId: cashier.id, branchId: branch.id })).rejects.toMatchObject({ code: 'OTP_INVALID' });
    expect(await db().customer.count({ where: { phone } })).toBe(0);
  });

  it('signs in the first time with the one-time password, then asks for their own, and the one-time password stops working', async () => {
    const { phone, customerId } = await register();
    const first = await loginWithPassword({ phone, password: CODE, ...meta });
    expect(first).toMatchObject({ customerId, passwordSet: false, profileComplete: true });
    const session = await readCustomerSession();
    expect(session?.customerId).toBe(customerId);

    await setFirstPassword({ customerId, sessionId: session!.sessionId, password: PASSWORD });
    await expect(setFirstPassword({ customerId, sessionId: session!.sessionId, password: 'another-password-9' })).rejects.toMatchObject({ code: 'CONFLICT' });

    jar.clear();
    await expect(loginWithPassword({ phone, password: CODE, ...meta })).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    expect(await readCustomerSession()).toBeNull();
    await expect(loginWithPassword({ phone, password: PASSWORD, ...meta })).resolves.toMatchObject({ customerId, passwordSet: true });
    expect(await readCustomerSession()).not.toBeNull();
  });

  it('refuses a short, obvious or phone-number password, and the one-time password itself', async () => {
    const { phone, customerId } = await register();
    await loginWithPassword({ phone, password: CODE, ...meta });
    const sessionId = (await readCustomerSession())!.sessionId;
    for (const password of ['short', '11111111', '12345678', `${phone.slice(-10)}x`, CODE]) {
      await expect(setFirstPassword({ customerId, sessionId, password })).rejects.toMatchObject({ code: 'VALIDATION' });
    }
    expect((await db().customer.findUniqueOrThrow({ where: { id: customerId } })).passwordHash).toBeNull();
  });

  it('answers a wrong number and a wrong password the same way', async () => {
    const { phone } = await register();
    await expect(loginWithPassword({ phone: uniquePhone(), password: PASSWORD, ...meta })).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    await expect(loginWithPassword({ phone, password: 'not-the-password', ...meta })).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    expect(await readCustomerSession()).toBeNull();
  });

  it('locks the account for 15 minutes after five wrong passwords, even for the right one', async () => {
    const { phone } = await register();
    for (let i = 0; i < 5; i++) await expect(loginWithPassword({ phone, password: 'wrong-password-1', ...meta })).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    await expect(loginWithPassword({ phone, password: CODE, ...meta })).rejects.toMatchObject({ code: 'ACCOUNT_LOCKED' });
    await expect(loginWithPassword({ phone, password: CODE, now: sec(16 * 60), ...meta })).resolves.toMatchObject({ passwordSet: false });
  });

  it('resets a forgotten password with a code, signs the customer out everywhere, and the reset works once', async () => {
    const { phone, customerId } = await register();
    await loginWithPassword({ phone, password: CODE, ...meta });
    await setFirstPassword({ customerId, sessionId: (await readCustomerSession())!.sessionId, password: PASSWORD });
    const token = jar.get('cj_c')!;

    const { challengeId } = await requestPasswordReset({ phone, ipHash: null });
    await expect(confirmPasswordReset({ challengeId, code: '000000' })).rejects.toMatchObject({ code: 'OTP_INVALID' });
    const { resetToken } = await confirmPasswordReset({ challengeId, code: CODE });
    await expect(resetPassword({ resetToken, password: 'short' })).rejects.toMatchObject({ code: 'VALIDATION' });
    await resetPassword({ resetToken, password: 'a-brand-new-password-7' });

    jar.set('cj_c', token); // the old session was ended by the reset
    expect(await readCustomerSession()).toBeNull();
    await expect(loginWithPassword({ phone, password: PASSWORD, ...meta })).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    await expect(loginWithPassword({ phone, password: 'a-brand-new-password-7', ...meta })).resolves.toMatchObject({ customerId, passwordSet: true });
    await expect(resetPassword({ resetToken, password: 'yet-another-password-3' })).rejects.toMatchObject({ code: 'OTP_INVALID' }); // already used
  });

  it('gives a forgotten-password answer that does not reveal whether a number has an account', async () => {
    const stranger = await requestPasswordReset({ phone: uniquePhone(), ipHash: null });
    expect(stranger.challengeId).toMatch(/^[0-9a-f-]{36}$/);
    await expect(confirmPasswordReset({ challengeId: stranger.challengeId, code: CODE })).rejects.toMatchObject({ code: 'OTP_INVALID' });
  });

  it('refuses a reset token that has expired or was tampered with', async () => {
    const { phone } = await register();
    const { challengeId } = await requestPasswordReset({ phone, ipHash: null });
    const { resetToken } = await confirmPasswordReset({ challengeId, code: CODE });
    await expect(resetPassword({ resetToken, password: 'a-brand-new-password-7', now: sec(11 * 60) })).rejects.toMatchObject({ code: 'OTP_INVALID' });
    await expect(resetPassword({ resetToken: `${resetToken.slice(0, -2)}xx`, password: 'a-brand-new-password-7' })).rejects.toMatchObject({ code: 'OTP_INVALID' });
  });

  it('ends a session on sign-out, on sign-out everywhere, after 90 days and when the customer is deleted', async () => {
    const { phone, customerId } = await register();
    await loginWithPassword({ phone, password: CODE, ...meta });
    expect(await readCustomerSession()).not.toBeNull();
    expect(await readCustomerSession(new Date(Date.now() + 91 * 86_400_000))).toBeNull();

    await endSession('customer');
    expect(await readCustomerSession()).toBeNull();

    await loginWithPassword({ phone, password: CODE, ...meta });
    const token = jar.get('cj_c')!;
    await revokeAllSessions({ customerId });
    jar.set('cj_c', token); // the same cookie, now revoked on the server
    expect(await readCustomerSession()).toBeNull();

    await loginWithPassword({ phone, password: CODE, ...meta });
    await db().customer.update({ where: { id: customerId }, data: { deletedAt: new Date() } });
    expect(await readCustomerSession()).toBeNull();
  });

  it('does not accept a made-up cookie', async () => {
    jar.set('cj_c', 'a'.repeat(43));
    expect(await readCustomerSession()).toBeNull();
    jar.set('cj_c', 'short');
    expect(await readCustomerSession()).toBeNull();
  });
});

describe('staff sign-in (CA-18, MG-21)', () => {
  it('signs a cashier in with phone and PIN at their own outlet', async () => {
    const cashier = await makeStaff('CASHIER', [branch.id], { pin: PIN });
    await expect(loginWithPin({ phone: cashier.phone, pin: PIN, ...meta })).resolves.toEqual({ status: 'ok', staffId: cashier.id });
    const session = await readStaffSession();
    expect(session).toMatchObject({ branchId: branch.id, allowedBranchIds: [branch.id], staff: { id: cashier.id, role: 'CASHIER' } });
    expect((await db().staff.findUniqueOrThrow({ where: { id: cashier.id } })).lastLoginAt).not.toBeNull();
  });

  it('says the same thing for a wrong PIN, an unknown number and a switched-off account', async () => {
    const cashier = await makeStaff('CASHIER', [branch.id], { pin: PIN });
    const off = await makeStaff('CASHIER', [branch.id], { pin: PIN, active: false });
    const attempts = [
      () => loginWithPin({ phone: cashier.phone, pin: '000000', ...meta }),
      () => loginWithPin({ phone: uniquePhone(), pin: PIN, ...meta }),
      () => loginWithPin({ phone: off.phone, pin: PIN, ...meta }),
    ];
    for (const attempt of attempts) {
      await expect(attempt()).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', status: 422 });
    }
    expect(await readStaffSession()).toBeNull();
  });

  it('locks the account for 15 minutes after five wrong PINs, even for the right one', async () => {
    const cashier = await makeStaff('CASHIER', [branch.id], { pin: PIN });
    for (let i = 0; i < 5; i++) await expect(loginWithPin({ phone: cashier.phone, pin: '000000', ...meta })).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    await expect(loginWithPin({ phone: cashier.phone, pin: PIN, ...meta })).rejects.toMatchObject({ code: 'ACCOUNT_LOCKED', status: 429 });
    await expect(loginWithPin({ phone: cashier.phone, pin: PIN, ...meta, now: sec(14 * 60) })).rejects.toMatchObject({ code: 'ACCOUNT_LOCKED' });
    await expect(loginWithPin({ phone: cashier.phone, pin: PIN, ...meta, now: sec(16 * 60) })).resolves.toMatchObject({ status: 'ok' });
    expect((await db().staff.findUniqueOrThrow({ where: { id: cashier.id } })).failedPinAttempts).toBe(0);
  });

  it('counts only consecutive failures: a right PIN resets the count', async () => {
    const cashier = await makeStaff('CASHIER', [branch.id], { pin: PIN });
    for (let i = 0; i < 4; i++) await expect(loginWithPin({ phone: cashier.phone, pin: '000000', ...meta })).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    await loginWithPin({ phone: cashier.phone, pin: PIN, ...meta });
    for (let i = 0; i < 4; i++) await expect(loginWithPin({ phone: cashier.phone, pin: '000000', ...meta })).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    await expect(loginWithPin({ phone: cashier.phone, pin: PIN, ...meta })).resolves.toMatchObject({ status: 'ok' });
  });

  it('asks a manager for an SMS code after the PIN, and only then signs them in', async () => {
    const manager = await makeStaff('MANAGER', [branch.id], { pin: PIN });
    const step1 = await loginWithPin({ phone: manager.phone, pin: PIN, ...meta });
    expect(step1.status).toBe('otp_required');
    expect(await readStaffSession()).toBeNull(); // the PIN alone is not enough

    if (step1.status !== 'otp_required') throw new Error('expected a code step');
    await expect(completeStaffLogin({ challengeId: step1.challengeId, code: '000000', ...meta })).rejects.toMatchObject({ code: 'OTP_INVALID' });
    await completeStaffLogin({ challengeId: step1.challengeId, code: CODE, ...meta });
    expect(await readStaffSession()).toMatchObject({ staff: { id: manager.id, role: 'MANAGER' }, branchId: branch.id });
  });

  it('keeps cashiers out of the management sign-in, with the same answer as a wrong PIN', async () => {
    const cashier = await makeStaff('CASHIER', [branch.id], { pin: PIN });
    await expect(loginWithPin({ phone: cashier.phone, pin: PIN, area: 'admin', ...meta })).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    expect(await readStaffSession()).toBeNull();
    await expect(loginWithPin({ phone: cashier.phone, pin: PIN, area: 'cashier', ...meta })).resolves.toMatchObject({ status: 'ok' });
    const manager = await makeStaff('MANAGER', [branch.id], { pin: PIN });
    await expect(loginWithPin({ phone: manager.phone, pin: PIN, area: 'admin', ...meta })).resolves.toMatchObject({ status: 'otp_required' });
  });

  it('does not let a customer code be used as a staff code', async () => {
    const manager = await makeStaff('MANAGER', [branch.id], { pin: PIN });
    const { challengeId } = await issueOtp({ purpose: 'CUSTOMER_LOGIN', phone: manager.phone, ipHash: null });
    await expect(completeStaffLogin({ challengeId, code: CODE, ...meta })).rejects.toMatchObject({ code: 'OTP_INVALID' });
  });

  it('locks a staff session after 30 minutes without a request, and after 12 hours whatever happens', async () => {
    const cashier = await makeStaff('CASHIER', [branch.id], { pin: PIN });
    await loginWithPin({ phone: cashier.phone, pin: PIN, ...meta });
    // (a successful read refreshes "last seen", so check the idle case first, on the untouched session)
    expect(await readStaffSession(sec(31 * 60))).toBeNull();
    expect(await readStaffSession(sec(29 * 60))).not.toBeNull();
    expect(await readStaffSession(sec(13 * 3600))).toBeNull();
  });

  it('stops a session when the account is switched off', async () => {
    const cashier = await makeStaff('CASHIER', [branch.id], { pin: PIN });
    await loginWithPin({ phone: cashier.phone, pin: PIN, ...meta });
    await db().staff.update({ where: { id: cashier.id }, data: { active: false } });
    expect(await readStaffSession()).toBeNull();
  });

  it('keeps customer and staff sessions apart, so one person can be both', async () => {
    const cashier = await makeStaff('CASHIER', [branch.id], { pin: PIN });
    await loginWithPin({ phone: cashier.phone, pin: PIN, ...meta });
    expect(await readCustomerSession()).toBeNull();
    jar.set('cj_c', jar.get('cj_s')!); // a staff token presented as a customer cookie
    expect(await readCustomerSession()).toBeNull();
  });
});

describe('which outlet a session works at', () => {
  it('ties a cashier to their own outlet and refuses another', async () => {
    const cashier = await makeStaff('CASHIER', [branch.id], { pin: PIN });
    const row = { id: cashier.id, role: 'CASHIER' as const, active: true, branches: [{ branchId: branch.id }] };
    await expect(resolveBranch(row)).resolves.toBe(branch.id);
    await expect(resolveBranch(row, other.id)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(resolveBranch({ ...row, branches: [] })).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('lets a manager pick among theirs, and an owner pick any active outlet', async () => {
    const manager = { id: 'm', role: 'MANAGER' as const, active: true, branches: [{ branchId: branch.id }, { branchId: other.id }] };
    await expect(resolveBranch(manager, other.id)).resolves.toBe(other.id);
    await expect(resolveBranch(manager)).resolves.toBe(branch.id);

    const owner = { id: 'o', role: 'OWNER' as const, active: true, branches: [] };
    await expect(resolveBranch(owner, other.id)).resolves.toBe(other.id);
    await expect(resolveBranch(owner)).resolves.toEqual(expect.any(String));
    await expect(resolveBranch(owner, '00000000-0000-4000-8000-000000000000')).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe("a manager's PIN approves a limit override (BR-02)", () => {
  it("accepts the PIN of an active manager of this outlet, or of an owner", async () => {
    const cashier = await makeStaff('CASHIER', [branch.id], { pin: '111111' });
    const manager = await makeStaff('MANAGER', [branch.id], { pin: '222222' });
    const owner = await makeStaff('OWNER', [], { pin: '333333' });
    await expect(approveOverride({ actor: actorOf(cashier, branch.id), pin: '222222' })).resolves.toEqual({ approverId: manager.id });
    await expect(approveOverride({ actor: actorOf(cashier, branch.id), pin: '333333' })).resolves.toEqual({ approverId: owner.id });
  });

  it('refuses the cashiers own PIN, another outletss manager, an inactive manager and a wrong PIN', async () => {
    const cashier = await makeStaff('CASHIER', [branch.id], { pin: '111111' });
    await makeStaff('MANAGER', [other.id], { pin: '444444' });
    await makeStaff('MANAGER', [branch.id], { pin: '555555', active: false });
    for (const pin of ['111111', '444444', '555555', '999999']) {
      await expect(approveOverride({ actor: actorOf(cashier, branch.id), pin })).rejects.toMatchObject({ code: 'OVERRIDE_NOT_APPROVED' });
    }
  });

  it('locks the cashier after five wrong tries, so a manager PIN cannot be guessed', async () => {
    const cashier = await makeStaff('CASHIER', [branch.id], { pin: '111112' });
    const manager = await makeStaff('MANAGER', [branch.id], { pin: '666666' });
    for (let i = 0; i < 5; i++) await expect(approveOverride({ actor: actorOf(cashier, branch.id), pin: '000001' })).rejects.toMatchObject({ code: 'OVERRIDE_NOT_APPROVED' });
    await expect(approveOverride({ actor: actorOf(cashier, branch.id), pin: '666666' })).rejects.toMatchObject({ code: 'ACCOUNT_LOCKED' });
    await expect(approveOverride({ actor: actorOf(cashier, branch.id), pin: '666666', now: sec(16 * 60) })).resolves.toEqual({ approverId: manager.id });
  });
});
