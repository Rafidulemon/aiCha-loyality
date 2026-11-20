import { afterAll, describe, expect, it } from 'vitest';
import { closeDb, db } from '@/server/db';
import { updateProfile } from '@/server/domain/customers';
import { verifyLedger } from '@/server/domain/invariants';
import { makeCustomer } from './helpers';

afterAll(async () => {
  expect(await verifyLedger(db())).toEqual([]);
  await closeDb();
});

describe('customer profile', () => {
  it('stores an email in lower case and clears it with an empty value', async () => {
    const c = await makeCustomer();
    expect((await updateProfile(db(), c.id, { email: 'tanvir@example.com' })).email).toBe('tanvir@example.com');
    expect((await updateProfile(db(), c.id, { email: '' })).email).toBeNull();
  });

  it('lets a birthday be set once, then locks it', async () => {
    const c = await makeCustomer();
    expect((await updateProfile(db(), c.id, { birthday: '1996-03-12' })).birthday?.toISOString().slice(0, 10)).toBe('1996-03-12');
    await expect(updateProfile(db(), c.id, { birthday: '1996-03-13' })).rejects.toMatchObject({ code: 'BIRTHDAY_LOCKED' });
    await expect(updateProfile(db(), c.id, { birthday: null })).rejects.toMatchObject({ code: 'BIRTHDAY_LOCKED' });
    // Saving the same date, or changing other fields, still works.
    await expect(updateProfile(db(), c.id, { birthday: '1996-03-12', name: 'Tanvir' })).resolves.toMatchObject({ name: 'Tanvir' });
    expect((await db().customer.findUniqueOrThrow({ where: { id: c.id } })).birthday?.toISOString().slice(0, 10)).toBe('1996-03-12');
  });

  it('allows push and email notifications by default and lets the customer switch them off', async () => {
    const c = await makeCustomer();
    expect(c).toMatchObject({ pushNotify: true, emailNotify: true });
    expect(await updateProfile(db(), c.id, { pushNotify: false })).toMatchObject({ pushNotify: false, emailNotify: true });
    expect(await updateProfile(db(), c.id, { emailNotify: false, pushNotify: true })).toMatchObject({ pushNotify: true, emailNotify: false });
  });
});
