-- Add lyrics fields to songs table
ALTER TABLE "songs" ADD COLUMN IF NOT EXISTS "lyrics" TEXT;
ALTER TABLE "songs" ADD COLUMN IF NOT EXISTS "lyrics_synced" TEXT;
ALTER TABLE "songs" ADD COLUMN IF NOT EXISTS "deezer_id" TEXT;
