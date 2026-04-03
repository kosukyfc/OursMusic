DO $$ BEGIN
  CREATE TYPE "DeviceType" AS ENUM ('browser', 'mobile', 'speaker', 'tv');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "devices" (
  "id"         TEXT NOT NULL,
  "user_id"    TEXT NOT NULL,
  "socket_id"  TEXT NOT NULL,
  "name"       TEXT NOT NULL,
  "type"       "DeviceType" NOT NULL DEFAULT 'browser',
  "is_master"  BOOLEAN NOT NULL DEFAULT false,
  "is_active"  BOOLEAN NOT NULL DEFAULT true,
  "last_seen"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "devices_user_id_idx" ON "devices"("user_id");

CREATE TABLE IF NOT EXISTS "playback_sessions" (
  "id"          TEXT NOT NULL,
  "user_id"     TEXT NOT NULL,
  "song_id"     TEXT,
  "song_url"    TEXT,
  "is_playing"  BOOLEAN NOT NULL DEFAULT false,
  "position_ms" INTEGER NOT NULL DEFAULT 0,
  "started_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "playback_sessions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "playback_sessions_user_id_key" ON "playback_sessions"("user_id");
