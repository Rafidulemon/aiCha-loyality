import { confirmPasswordReset } from '@/server/auth/customer';
import { publicRoute } from '@/server/http';
import { passwordVerify } from '@/lib/contracts/schemas';

/** Forgot password, step two: check the code. The answer is a short-lived token for choosing the new password. */
export const POST = publicRoute({ body: passwordVerify }, async ({ body }) => confirmPasswordReset(body));
