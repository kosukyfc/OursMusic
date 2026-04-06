-- Add rich metadata fields to songs table
ALTER TABLE "songs" ADD COLUMN IF NOT EXISTS "artist" TEXT;
ALTER TABLE "songs" ADD COLUMN IF NOT EXISTS "album_name" TEXT;
ALTER TABLE "songs" ADD COLUMN IF NOT EXISTS "cover_url" TEXT;
ALTER TABLE "songs" ADD COLUMN IF NOT EXISTS "spotify_id" TEXT;
ALTER TABLE "songs" ADD COLUMN IF NOT EXISTS "popularity" INTEGER;
