-- Add social fields to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" TEXT UNIQUE;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bio" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "cover_url" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_private" BOOLEAN NOT NULL DEFAULT false;

-- Create follows table
CREATE TABLE IF NOT EXISTS "follows" (
  "follower_id"  TEXT NOT NULL,
  "following_id" TEXT NOT NULL,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "follows_pkey" PRIMARY KEY ("follower_id", "following_id"),
  CONSTRAINT "follows_follower_id_fkey"  FOREIGN KEY ("follower_id")  REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "follows_follower_id_idx"  ON "follows"("follower_id");
CREATE INDEX IF NOT EXISTS "follows_following_id_idx" ON "follows"("following_id");
