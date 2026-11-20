import { removeSubscription } from '@/server/domain/push';
import { customerRoute } from '@/server/http';
import { pushUnsubscribe } from '@/lib/contracts/schemas';

/**
 * Turn notifications off for one browser. It is a POST with the address in the body, not a DELETE with it in the URL, so the address
 * (which lets anyone who has it send to that browser) never lands in access logs.
 */
export const POST = customerRoute({ body: pushUnsubscribe }, async ({ body }) => {
  await removeSubscription(body.endpoint);
});
