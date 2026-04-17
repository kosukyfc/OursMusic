/*
  Warnings:

  - You are about to drop the `audio_settings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `voice_command_histories` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "audio_settings";

-- DropTable
DROP TABLE "voice_command_histories";

-- CreateTable
CREATE TABLE "genres" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "cover_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "genres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "genre_songs" (
    "genre_id" TEXT NOT NULL,
    "song_id" TEXT NOT NULL,

    CONSTRAINT "genre_songs_pkey" PRIMARY KEY ("genre_id","song_id")
);

-- CreateTable
CREATE TABLE "artist_genres" (
    "genre_id" TEXT NOT NULL,
    "artist_id" TEXT NOT NULL,

    CONSTRAINT "artist_genres_pkey" PRIMARY KEY ("genre_id","artist_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "genres_name_key" ON "genres"("name");

-- CreateIndex
CREATE INDEX "genre_songs_song_id_idx" ON "genre_songs"("song_id");

-- CreateIndex
CREATE INDEX "artist_genres_artist_id_idx" ON "artist_genres"("artist_id");

-- AddForeignKey
ALTER TABLE "genre_songs" ADD CONSTRAINT "genre_songs_genre_id_fkey" FOREIGN KEY ("genre_id") REFERENCES "genres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "genre_songs" ADD CONSTRAINT "genre_songs_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "songs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_genres" ADD CONSTRAINT "artist_genres_genre_id_fkey" FOREIGN KEY ("genre_id") REFERENCES "genres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_genres" ADD CONSTRAINT "artist_genres_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
