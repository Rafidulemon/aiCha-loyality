import { fail } from '@/server/errors';
import { countDevices, saveSubscription } from '@/server/domain/push';
import { customerRoute } from '@/server/http';
import { pushPublicKey, pushSender } from '@/server/push';
import { pushSubscribe } from '@/lib/contracts/schemas';
import type { PushStatusDto } from '@/lib/contracts/dto';

/** Whether push notifications are switched on for the app, the key a browser needs to subscribe, and how many of this customer's devices get them. */
export const GET = customerRoute({}, async ({ customer }): Promise<PushStatusDto> => ({
  configured: pushSender() !== null,
  publicKey: pushPublicKey(),
  devices: await countDevices(customer.customerId),
}));

/** Turn notifications on for this browser (the subscription the browser made). Calling it again just refreshes the same subscription. */
export const PUT = customerRoute({ body: pushSubscribe }, async ({ customer, body, userAgent }): Promise<PushStatusDto> => {
  if (!pushSender()) throw fail.conflict('PUSH_NOT_CONFIGURED', 'Push notifications are not switched on');
  await saveSubscription({ customerId: customer.customerId, endpoint: body.endpoint, p256dh: body.keys.p256dh, auth: body.keys.auth, userAgent: userAgent?.slice(0, 300) ?? null });
  return { configured: true, publicKey: pushPublicKey(), devices: await countDevices(customer.customerId) };
});
