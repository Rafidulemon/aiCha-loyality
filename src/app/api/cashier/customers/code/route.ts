import { requestRegistrationCode } from '@/server/auth/customer';
import { env } from '@/server/env';
import { staffRoute } from '@/server/http';
import { registrationCodeRequest } from '@/lib/contracts/schemas';

/** Registering a customer at the counter, step one: send a code to the customer's phone to confirm the number. */
export const POST = staffRoute({ permission: 'counter.work', body: registrationCodeRequest }, async ({ body, ipHash }) => ({
  ...(await requestRegistrationCode({ phone: body.phone, ipHash })),
  mode: env().OTP_MODE,
}));
