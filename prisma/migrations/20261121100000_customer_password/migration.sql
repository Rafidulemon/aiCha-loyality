-- Customers sign in with a password they set themselves. Staff register them (with a code sent to the customer's phone),
-- the first sign-in uses a one-time password, and a forgotten password is reset with another code.
ALTER TYPE "OtpPurpose" ADD VALUE 'CUSTOMER_REGISTER';
ALTER TYPE "OtpPurpose" ADD VALUE 'CUSTOMER_RESET';

ALTER TABLE "Customer"
  ADD COLUMN "passwordHash" TEXT,
  ADD COLUMN "oneTimePasswordHash" TEXT,
  ADD COLUMN "passwordChangedAt" TIMESTAMPTZ(3),
  ADD COLUMN "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lockedUntil" TIMESTAMPTZ(3);
