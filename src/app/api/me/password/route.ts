import { setFirstPassword } from '@/server/auth/customer';
import { customerRoute } from '@/server/http';
import { setPasswordRequest } from '@/lib/contracts/schemas';

/** The first-sign-in step: the customer chooses their own password. Only possible while none is set (after that, use "Forgot password"). */
export const POST = customerRoute({ body: setPasswordRequest }, async ({ customer, body }) => {
  await setFirstPassword({ customerId: customer.customerId, sessionId: customer.sessionId, password: body.password });
  return { ok: true as const };
});
