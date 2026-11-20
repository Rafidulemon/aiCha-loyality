-- Notification preferences: push and email notifications are allowed by default.
ALTER TABLE "Customer" ADD COLUMN "pushNotify" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Customer" ADD COLUMN "emailNotify" BOOLEAN NOT NULL DEFAULT true;
