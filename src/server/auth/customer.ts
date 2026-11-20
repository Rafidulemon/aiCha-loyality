import 'server-only';
import { randomUUID } from 'node:crypto';
import { db } from '../db';
import { env } from '../env';
import { fail } from '../errors';
import { hashOneTimePassword, hashPassword, randomDigits, readToken, safeEqual, signToken, verifyOneTimePassword, verifyPassword } from '../crypto';
import { log, maskPhone } from '../log';
import { smsProvider } from '../sms';
import { createCustomer } from '../domain/customers';
import { passwordIssue, PASSWORD_ISSUE_TEXT } from '@/lib/domain/password';
import type { JoinChannel } from '@/generated/prisma/enums';
import { consumeOtp, issueOtp, OTP_RESEND_SEC, OTP_TTL_SEC, type IssuedOtp } from './otp';
import { startCustomerSession } from './session';

/**
 * Customer accounts (CU-01).
 *
 * - A customer cannot sign themselves up. Staff register them at the counter or from management: the number is confirmed with a code
 *   sent to the customer's phone, then the customer is sent a loyalty ID and a one-time password.
 * - The first sign-in uses that one-time password and leads straight to "choose your own password". From then on: phone and password.
 * - A forgotten password is reset with a code sent to the phone.
 * - While OTP_MODE=fixed nothing is sent and the one-time password is DEV_OTP_CODE. Once a real SMS gateway is connected, the one-time
 *   password is generated at registration, stored hashed and sent by SMS (see registerCustomer).
 * - Five wrong passwords lock the account for 15 minutes. A wrong number and a wrong password get the same answer.
 */

const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;
const RESET_TOKEN_MINUTES = 10;

export type CustomerLogin = { customerId: string; /** False on the first sign-in with the one-time password. */ passwordSet: boolean; profileComplete: boolean };

const memberCode = (no: number) => `CJ-${String(no).padStart(6, '0')}`;

function assertPassword(password: string, phone: string) {
  const issue = passwordIssue(password, phone);
  if (issue) throw fail.validation({ issues: [{ path: 'password', message: PASSWORD_ISSUE_TEXT[issue].en }] });
}

// ---------------------------------------------------------------------------------------------
// Sign-in
// ---------------------------------------------------------------------------------------------

export async function loginWithPassword(input: { phone: string; password: string; ipHash: string | null; userAgent: string | null; now?: Date }): Promise<CustomerLogin> {
  const now = input.now ?? new Date();
  const customer = await db().customer.findUnique({ where: { phone: input.phone } });

  if (!customer || customer.deletedAt) {
    await verifyPassword(input.password, null); // same cost as a real check
    throw fail.unprocessable('INVALID_CREDENTIALS', 'Wrong mobile number or password');
  }
  if (customer.lockedUntil && customer.lockedUntil > now) {
    throw fail.rateLimited('ACCOUNT_LOCKED', Math.ceil((customer.lockedUntil.getTime() - now.getTime()) / 1000), 'Too many wrong passwords. Try again later');
  }

  let right: boolean;
  if (customer.passwordHash) {
    right = await verifyPassword(input.password, customer.passwordHash);
  } else if (env().OTP_MODE === 'fixed') {
    right = safeEqual(input.password, env().DEV_OTP_CODE ?? ''); // the one-time password while no SMS gateway is connected
  } else {
    right = await verifyOneTimePassword(input.password, customer.oneTimePasswordHash);
  }

  if (!right) {
    const { failedLoginAttempts } = await db().customer.update({ where: { id: customer.id }, data: { failedLoginAttempts: { increment: 1 } }, select: { failedLoginAttempts: true } });
    if (failedLoginAttempts >= MAX_FAILURES) {
      await db().customer.update({ where: { id: customer.id }, data: { failedLoginAttempts: 0, lockedUntil: new Date(now.getTime() + LOCK_MINUTES * 60_000) } });
    }
    log.warn('customer.login_failed', { to: maskPhone(input.phone) });
    throw fail.unprocessable('INVALID_CREDENTIALS', 'Wrong mobile number or password');
  }
  if (customer.failedLoginAttempts > 0 || customer.lockedUntil) {
    await db().customer.update({ where: { id: customer.id }, data: { failedLoginAttempts: 0, lockedUntil: null } });
  }

  await startCustomerSession(customer.id, { ipHash: input.ipHash, userAgent: input.userAgent }, now);
  return { customerId: customer.id, passwordSet: customer.passwordHash !== null, profileComplete: customer.profileCompletedAt !== null };
}

/** The "choose your own password" step after the first sign-in. Other signed-in devices are signed out, this one stays. */
export async function setFirstPassword(input: { customerId: string; sessionId: string; password: string; now?: Date }): Promise<void> {
  const now = input.now ?? new Date();
  const customer = await db().customer.findUniqueOrThrow({ where: { id: input.customerId }, select: { phone: true, passwordHash: true } });
  if (customer.passwordHash) throw fail.conflict('CONFLICT', 'A password is already set. Use "Forgot password" to change it');
  assertPassword(input.password, customer.phone);
  // The one-time password must not become the real one.
  const same = env().OTP_MODE === 'fixed' ? safeEqual(input.password, env().DEV_OTP_CODE ?? '') : false;
  if (same) throw fail.validation({ issues: [{ path: 'password', message: 'Choose a password different from the one-time password' }] });
  const hash = await hashPassword(input.password);
  await db().$transaction([
    db().customer.update({ where: { id: input.customerId }, data: { passwordHash: hash, oneTimePasswordHash: null, passwordChangedAt: now, failedLoginAttempts: 0, lockedUntil: null } }),
    db().session.updateMany({ where: { customerId: input.customerId, revokedAt: null, id: { not: input.sessionId } }, data: { revokedAt: now } }),
  ]);
}

// ---------------------------------------------------------------------------------------------
// Forgot password
// ---------------------------------------------------------------------------------------------

/** Sends a reset code. The answer is the same whether or not the number has an account, so numbers cannot be probed. */
export async function requestPasswordReset(input: { phone: string; ipHash: string | null }): Promise<IssuedOtp> {
  const customer = await db().customer.findUnique({ where: { phone: input.phone }, select: { deletedAt: true } });
  if (!customer || customer.deletedAt) return { challengeId: randomUUID(), expiresInSec: OTP_TTL_SEC, resendAfterSec: OTP_RESEND_SEC };
  return issueOtp({ purpose: 'CUSTOMER_RESET', phone: input.phone, ipHash: input.ipHash });
}

/** Checks the code and hands back a short-lived token for the new-password step. The token stops working once the password changes. */
export async function confirmPasswordReset(input: { challengeId: string; code: string; now?: Date }): Promise<{ resetToken: string }> {
  const now = input.now ?? new Date();
  const { phone } = await consumeOtp({ purpose: 'CUSTOMER_RESET', challengeId: input.challengeId, code: input.code, now });
  const customer = await db().customer.findUnique({ where: { phone }, select: { id: true, deletedAt: true, passwordChangedAt: true } });
  if (!customer || customer.deletedAt) throw fail.unprocessable('OTP_INVALID', 'That code is not valid. Ask for a new one');
  const resetToken = signToken('password-reset', { c: customer.id, e: now.getTime() + RESET_TOKEN_MINUTES * 60_000, s: customer.passwordChangedAt?.getTime() ?? 0 });
  return { resetToken };
}

export async function resetPassword(input: { resetToken: string; password: string; now?: Date }): Promise<void> {
  const now = input.now ?? new Date();
  const claim = readToken<{ c: string; e: number; s: number }>('password-reset', input.resetToken);
  const invalid = () => fail.unprocessable('OTP_INVALID', 'This reset link has expired. Start again');
  if (!claim || typeof claim.c !== 'string' || claim.e <= now.getTime()) throw invalid();
  const customer = await db().customer.findUnique({ where: { id: claim.c }, select: { id: true, phone: true, deletedAt: true, passwordChangedAt: true } });
  if (!customer || customer.deletedAt || (customer.passwordChangedAt?.getTime() ?? 0) !== claim.s) throw invalid(); // already used
  assertPassword(input.password, customer.phone);
  const hash = await hashPassword(input.password);
  await db().$transaction([
    db().customer.update({ where: { id: customer.id }, data: { passwordHash: hash, oneTimePasswordHash: null, passwordChangedAt: now, failedLoginAttempts: 0, lockedUntil: null } }),
    db().session.updateMany({ where: { customerId: customer.id, revokedAt: null }, data: { revokedAt: now } }),
  ]);
}

// ---------------------------------------------------------------------------------------------
// Registration by staff
// ---------------------------------------------------------------------------------------------

/** Step one at the counter: send a code to the customer's phone, to prove the number is theirs. */
export async function requestRegistrationCode(input: { phone: string; ipHash: string | null }): Promise<IssuedOtp> {
  const existing = await db().customer.findUnique({ where: { phone: input.phone }, select: { deletedAt: true } });
  if (existing && !existing.deletedAt) throw fail.conflict('PHONE_TAKEN', 'This number already has a card');
  return issueOtp({ purpose: 'CUSTOMER_REGISTER', phone: input.phone, ipHash: input.ipHash });
}

/**
 * Step two: the customer read the code out, the staff member typed it. Creates the card (with the welcome stamp), then sends the
 * customer their loyalty ID and one-time password. In fixed mode (no SMS gateway yet) nothing is sent: the one-time password is DEV_OTP_CODE.
 */
export async function registerCustomer(input: {
  challengeId: string;
  code: string;
  phone: string;
  name: string;
  smsConsent?: boolean;
  joinedVia: Extract<JoinChannel, 'COUNTER' | 'MANAGEMENT'>;
  staffId: string;
  branchId?: string | null;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const confirmed = await consumeOtp({ purpose: 'CUSTOMER_REGISTER', challengeId: input.challengeId, code: input.code, now });
  // The code was sent to one number; it cannot register another.
  if (confirmed.phone !== input.phone) throw fail.unprocessable('OTP_INVALID', 'That code is not valid. Ask for a new one');

  const result = await db().$transaction(
    (tx) => createCustomer(tx, { phone: input.phone, name: input.name, smsConsent: input.smsConsent, joinedVia: input.joinedVia, createdById: input.staffId, branchId: input.branchId, at: now }),
    { maxWait: 10_000, timeout: 20_000 },
  );

  if (env().OTP_MODE !== 'fixed') {
    const oneTime = randomDigits(8);
    await db().customer.update({ where: { id: result.customer.id }, data: { oneTimePasswordHash: await hashOneTimePassword(oneTime) } });
    try {
      await smsProvider().send(input.phone, `AiCha: Welcome! Your loyalty ID is ${memberCode(result.customer.memberNo)}. Sign in with this number and the one-time password ${oneTime}, then choose your own password.`);
    } catch (e) {
      // The card exists; staff can ask the customer to use "Forgot password" if the text never arrives.
      log.error('customer.welcome_sms_failed', { to: maskPhone(input.phone), err: e instanceof Error ? e.message : String(e) });
    }
  }
  log.info('customer.registered', { to: maskPhone(input.phone), via: input.joinedVia, mode: env().OTP_MODE });
  return result;
}
