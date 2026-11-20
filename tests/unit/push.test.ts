import { describe, expect, it } from 'vitest';
import { isAllowedPushEndpoint, rewardUnlockedMessage, stampAddedMessage, testMessage } from '@/lib/domain/push';
import { pushSubscribe, pushUnsubscribe } from '@/lib/contracts/schemas';

describe('push service addresses (what the server is allowed to send to)', () => {
  it('accepts the addresses of the push services browsers use', () => {
    for (const url of [
      'https://fcm.googleapis.com/fcm/send/abc123',
      'https://fcm.googleapis.com/wp/abc123',
      'https://updates.push.services.mozilla.com/wpush/v2/abc123',
      'https://web.push.apple.com/QGxyz',
      'https://wns2-par02p.notify.windows.com/w/?token=abc',
    ]) {
      expect(isAllowedPushEndpoint(url), url).toBe(true);
    }
  });

  it('refuses anything else, so a customer cannot make the server call an address of their choosing', () => {
    for (const url of [
      'http://fcm.googleapis.com/fcm/send/abc', // not https
      'https://localhost/x',
      'https://127.0.0.1/x',
      'https://169.254.169.254/latest/meta-data',
      'https://fcm.googleapis.com.evil.example/fcm/send/abc', // looks like it, is not
      'https://evilfcm.googleapis.com/fcm/send/abc',
      'https://notify.windows.com.evil.example/x',
      'https://push.apple.com/x', // only subdomains of it are used
      'https://fcm.googleapis.com:8443/fcm/send/abc',
      'https://user:pass@fcm.googleapis.com/fcm/send/abc',
      'https://fcm.googleapis.com', // no path: not a subscription
      'not a url',
      '',
    ]) {
      expect(isAllowedPushEndpoint(url), url).toBe(false);
    }
  });
});

describe('push messages', () => {
  it('tells how many stamps landed, where, and how many are left', () => {
    expect(stampAddedMessage({ lang: 'en', count: 2, stamps: 7, total: 10, outlet: 'Mirpur 10' })).toEqual({
      title: '+2 stamps at Mirpur 10',
      body: 'You have 7/10. 3 more for your free reward.',
      url: '/cards',
      tag: 'stamp',
    });
    expect(stampAddedMessage({ lang: 'en', count: 1, stamps: 9, total: 10 })).toMatchObject({ title: '+1 stamp', body: 'You have 9/10. 1 more for your free reward.' });
  });

  it('writes Bangla with Bangla digits', () => {
    const m = stampAddedMessage({ lang: 'bn', count: 2, stamps: 7, total: 10, outlet: 'মিরপুর ১০' });
    expect(m.title).toBe('মিরপুর ১০-এ +২টি Stamp');
    expect(m.body).toBe('আপনার ৭/১০ Stamp হয়েছে। ফ্রি Reward পেতে আর ৩টি বাকি।');
  });

  it('never says a negative number of stamps are left', () => {
    expect(stampAddedMessage({ lang: 'en', count: 3, stamps: 12, total: 10 }).body).toContain('0 more');
  });

  it('exists in both languages for a reward and for the test, and they take the customer to the right page', () => {
    expect(rewardUnlockedMessage('en')).toMatchObject({ title: 'Reward unlocked!', url: '/rewards', tag: 'reward' });
    expect(rewardUnlockedMessage('bn').title).toMatch(/[অ-হ]/);
    expect(testMessage('en')).toMatchObject({ url: '/profile', tag: 'test' });
    expect(testMessage('bn').body).toMatch(/[অ-হ]/);
  });
});

describe('push subscription requests', () => {
  const keys = { p256dh: 'B'.repeat(87), auth: 'a'.repeat(22) };
  const endpoint = 'https://fcm.googleapis.com/fcm/send/abc123';

  it('accepts what PushSubscription.toJSON() gives, and ignores the rest', () => {
    const parsed = pushSubscribe.parse({ endpoint, expirationTime: null, keys });
    expect(parsed).toEqual({ endpoint, keys });
  });

  it('refuses another address, and keys of the wrong size or alphabet', () => {
    expect(pushSubscribe.safeParse({ endpoint: 'https://example.com/push', keys }).success).toBe(false);
    expect(pushSubscribe.safeParse({ endpoint, keys: { ...keys, p256dh: 'short' } }).success).toBe(false);
    expect(pushSubscribe.safeParse({ endpoint, keys: { ...keys, auth: 'not base64url!!!!!!!!!!!' } }).success).toBe(false);
    expect(pushSubscribe.safeParse({ endpoint }).success).toBe(false);
  });

  it('lets any address be turned off (an old or odd one must still be removable)', () => {
    expect(pushUnsubscribe.safeParse({ endpoint: 'https://example.com/anything-at-all' }).success).toBe(true);
    expect(pushUnsubscribe.safeParse({ endpoint: '' }).success).toBe(false);
  });
});
