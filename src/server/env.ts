import 'server-only';
import { z } from 'zod';

/** An optional setting: a line like `NAME=` in a .env file means "not set". */
const unsetIfEmpty = <T extends z.ZodType>(schema: T) => z.preprocess((v) => (v === '' ? undefined : v), schema.optional());

/**
 * Environment, checked once on first use (not at import, so `next build` works without secrets) and checked hard:
 * a misconfigured server refuses to start answering instead of running with unsafe settings.
 * Error messages name variables, never values.
 */
const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    /** Pooled Neon connection string, used by the app. The CLI (migrations) uses DATABASE_URL_UNPOOLED, see prisma.config.ts. */
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    /** Test runs only: put every table in this Postgres schema instead of "public". */
    DATABASE_SCHEMA: z.string().regex(/^[a-z_][a-z0-9_]*$/, 'DATABASE_SCHEMA must be a plain lowercase identifier').optional(),
    DB_POOL_MAX: z.coerce.number().int().min(1).max(50).default(5),
    /** Keys the OTP hashes, the PIN hashes, the rotating member QR and the IP hashes. 32+ random characters. */
    AUTH_SECRET: z.string().min(32, 'AUTH_SECRET must be at least 32 characters'),
    /** The public origin, for the cross-site request check. Defaults to the origin of the request. */
    APP_ORIGIN: z.string().url().optional(),
    /** "sms": a random code goes out by SMS. "fixed": everyone uses DEV_OTP_CODE, development only. */
    OTP_MODE: z.enum(['fixed', 'sms']).default('sms'),
    DEV_OTP_CODE: z.string().regex(/^\d{6}$/, 'DEV_OTP_CODE must be exactly 6 digits').optional(),
    /**
     * TEMPORARY escape hatch: lets a production server use OTP_MODE=fixed (one shared sign-in code for everyone) and the console SMS
     * provider until a real SMS gateway is connected. Anyone who knows the code can sign in as any customer, and as staff who know
     * the PIN, so keep the code secret and remove this switch as soon as the gateway is live.
     */
    ALLOW_FIXED_OTP_IN_PRODUCTION: z.enum(['true', 'false']).default('false'),
    /** "console" prints messages on the server, so it never reaches a real phone. A gateway adapter comes with the contract. */
    SMS_PROVIDER: z.enum(['console']).default('console'),
    /** Lets the scheduler (Vercel Cron) call /api/cron/*. Without it those routes are off. */
    CRON_SECRET: z.string().min(24, 'CRON_SECRET must be at least 24 characters').optional(),
    /** Web push (notifications on customers' phones). All three or none: with none, the feature is switched off. */
    VAPID_PUBLIC_KEY: unsetIfEmpty(z.string().regex(/^[A-Za-z0-9_-]{87}$/, 'VAPID_PUBLIC_KEY must be the 87-character key from `npm run push:keys`')),
    VAPID_PRIVATE_KEY: unsetIfEmpty(z.string().regex(/^[A-Za-z0-9_-]{43}$/, 'VAPID_PRIVATE_KEY must be the 43-character key from `npm run push:keys`')),
    /** Who the push services can contact about this sender: `mailto:someone@yourdomain` or `https://yourdomain`. */
    VAPID_SUBJECT: unsetIfEmpty(z.string().regex(/^(mailto:[^\s@]+@[^\s@]+|https:\/\/\S+)$/, 'VAPID_SUBJECT must be mailto:you@example.com or an https:// address')),
  })
  .superRefine((v, ctx) => {
    const production = v.NODE_ENV === 'production';
    const fixedAllowed = v.ALLOW_FIXED_OTP_IN_PRODUCTION === 'true';
    const vapid = [v.VAPID_PUBLIC_KEY, v.VAPID_PRIVATE_KEY, v.VAPID_SUBJECT];
    if (vapid.some(Boolean) && !vapid.every(Boolean)) {
      for (const [name, value] of [['VAPID_PUBLIC_KEY', v.VAPID_PUBLIC_KEY], ['VAPID_PRIVATE_KEY', v.VAPID_PRIVATE_KEY], ['VAPID_SUBJECT', v.VAPID_SUBJECT]] as const) {
        if (!value) ctx.addIssue({ code: 'custom', path: [name], message: `${name} is required when any other VAPID setting is set (web push needs all three)` });
      }
    }
    if (v.OTP_MODE === 'fixed' && production && !fixedAllowed) {
      ctx.addIssue({ code: 'custom', path: ['OTP_MODE'], message: 'OTP_MODE=fixed is for development only and is refused in production (unless ALLOW_FIXED_OTP_IN_PRODUCTION=true)' });
    }
    if (v.OTP_MODE === 'fixed' && !v.DEV_OTP_CODE) {
      ctx.addIssue({ code: 'custom', path: ['DEV_OTP_CODE'], message: 'DEV_OTP_CODE is required when OTP_MODE=fixed' });
    }
    if (fixedAllowed && !(production && v.OTP_MODE === 'fixed')) {
      ctx.addIssue({ code: 'custom', path: ['ALLOW_FIXED_OTP_IN_PRODUCTION'], message: 'ALLOW_FIXED_OTP_IN_PRODUCTION only makes sense in production with OTP_MODE=fixed' });
    }
    if (production && v.DEV_OTP_CODE && !fixedAllowed) {
      ctx.addIssue({ code: 'custom', path: ['DEV_OTP_CODE'], message: 'DEV_OTP_CODE must not be set in production' });
    }
    if (production && v.SMS_PROVIDER === 'console' && !fixedAllowed) {
      ctx.addIssue({ code: 'custom', path: ['SMS_PROVIDER'], message: 'The console SMS provider cannot be used in production: connect an SMS gateway first' });
    }
  });

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  ${i.path.join('.') || '(env)'}: ${i.message}`);
    throw new Error(`Invalid server configuration:\n${lines.join('\n')}`);
  }
  cached = parsed.data;
  return cached;
}

/** For tests that change the environment between cases. */
export function resetEnvForTests() {
  cached = undefined;
}
