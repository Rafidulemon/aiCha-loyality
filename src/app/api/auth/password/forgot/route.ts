import { requestPasswordReset } from '@/server/auth/customer';
import { env } from '@/server/env';
import { publicRoute } from '@/server/http';
import { passwordForgot } from '@/lib/contracts/schemas';

/** Forgot password, step one: send a code to the number. The answer is the same whether or not the number has an account. */
export const POST = publicRoute({ body: passwordForgot }, async ({ body, ipHash }) => ({
  ...(await requestPasswordReset({ phone: body.phone, ipHash })),
  mode: env().OTP_MODE,
}));
