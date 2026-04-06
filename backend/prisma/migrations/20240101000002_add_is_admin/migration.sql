-- Add is_admin field to users table
ALTER TABLE "users" ADD COLUMN "is_admin" BOOLEAN NOT NULL DEFAULT false;

-- Set existing admin user (seeded) as admin
UPDATE "users" SET "is_admin" = true WHERE "plan" = 'premium';
