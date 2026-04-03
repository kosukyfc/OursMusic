-- Add availability flag and preview URL to songs
ALTER TABLE "songs" ADD COLUMN IF NOT EXISTS "available" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "songs" ADD COLUMN IF NOT EXISTS "preview_url" TEXT;

-- Songs imported from Spotify catalog without audio file are marked unavailable
-- UPDATE "songs" SET "available" = false WHERE "storage_path" = '';
