import { resetPassword } from '@/server/auth/customer';
import { publicRoute } from '@/server/http';
import { passwordReset } from '@/lib/contracts/schemas';

/** Forgot password, step three: choose the new password. Signs the customer out everywhere; they sign in again with it. */
export const POST = publicRoute({ body: passwordReset }, async ({ body }) => {
  await resetPassword(body);
  return { ok: true as const };
});
