import { loginWithPassword } from '@/server/auth/customer';
import { publicRoute } from '@/server/http';
import { customerLogin } from '@/lib/contracts/schemas';

/**
 * Customer sign-in: mobile number and password. A customer who has not chosen a password yet signs in with the one-time password
 * they were sent; `passwordSet: false` in the answer sends them to the "choose your password" screen.
 */
export const POST = publicRoute({ body: customerLogin }, async ({ body, ipHash, userAgent }) => {
  const { passwordSet, profileComplete } = await loginWithPassword({ ...body, ipHash, userAgent });
  return { passwordSet, profileComplete };
});
