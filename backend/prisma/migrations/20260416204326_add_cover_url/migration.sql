-- AlterTable
ALTER TABLE "playlists" ADD COLUMN     "cover_url" TEXT;

-- CreateTable
CREATE TABLE "lyrics_premium" (
    "id" TEXT NOT NULL,
    "track_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'user',
    "language" TEXT NOT NULL DEFAULT 'pt-BR',
    "has_word_sync" BOOLEAN NOT NULL DEFAULT false,
    "bpm" INTEGER,
    "album_art" TEXT,
    "duration" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lyrics_premium_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lyrics_premium_track_id_key" ON "lyrics_premium"("track_id");

-- CreateIndex
CREATE INDEX "lyrics_premium_track_id_idx" ON "lyrics_premium"("track_id");

-- CreateIndex
CREATE INDEX "lyrics_premium_source_idx" ON "lyrics_premium"("source");
