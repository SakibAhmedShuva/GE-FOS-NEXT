-- Adds optional per-user signature storage key for PDF signature parity.
ALTER TABLE "User" ADD COLUMN "signatureStorageKey" TEXT;
