-- CreateTable
CREATE TABLE "listening_heatmaps" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "hour" INTEGER NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listening_heatmaps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "music_theory_analyses" (
    "id" TEXT NOT NULL,
    "song_id" TEXT NOT NULL,
    "bpm" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "scale" TEXT NOT NULL,
    "energy" DOUBLE PRECISION NOT NULL,
    "danceability" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "music_theory_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artist_relationships" (
    "id" TEXT NOT NULL,
    "artist_id" TEXT NOT NULL,
    "related_artist_id" TEXT NOT NULL,
    "similarity" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "artist_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listening_histories" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "song_id" TEXT NOT NULL,
    "played_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "listening_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smart_queue_suggestions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "song_id" TEXT NOT NULL,
    "mood" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "smart_queue_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "setlists" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "setlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "setlist_songs" (
    "id" TEXT NOT NULL,
    "setlist_id" TEXT NOT NULL,
    "song_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "setlist_songs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "font_size" DOUBLE PRECISION NOT NULL DEFAULT 16.0,
    "line_height" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
    "letter_spacing" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "dyslexia_font" BOOLEAN NOT NULL DEFAULT false,
    "dyslexia_contrast" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audio_settings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "crossfade_duration" INTEGER NOT NULL DEFAULT 1000,
    "crossfade_enabled" BOOLEAN NOT NULL DEFAULT false,
    "karaoke_enabled" BOOLEAN NOT NULL DEFAULT false,
    "karaoke_vocal_reduction" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "audioducking_enabled" BOOLEAN NOT NULL DEFAULT false,
    "audioducking_reduction" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
    "gapless_playback" BOOLEAN NOT NULL DEFAULT false,
    "preload_threshold" INTEGER NOT NULL DEFAULT 5000,
    "queue_overlap" INTEGER NOT NULL DEFAULT 100,
    "keyboardBindings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audio_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_command_histories" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "successful" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voice_command_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "listening_heatmaps_user_id_idx" ON "listening_heatmaps"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "listening_heatmaps_user_id_day_of_week_hour_key" ON "listening_heatmaps"("user_id", "day_of_week", "hour");

-- CreateIndex
CREATE INDEX "music_theory_analyses_song_id_idx" ON "music_theory_analyses"("song_id");

-- CreateIndex
CREATE UNIQUE INDEX "music_theory_analyses_song_id_key" ON "music_theory_analyses"("song_id");

-- CreateIndex
CREATE INDEX "artist_relationships_artist_id_idx" ON "artist_relationships"("artist_id");

-- CreateIndex
CREATE UNIQUE INDEX "artist_relationships_artist_id_related_artist_id_key" ON "artist_relationships"("artist_id", "related_artist_id");

-- CreateIndex
CREATE INDEX "listening_histories_user_id_idx" ON "listening_histories"("user_id");

-- CreateIndex
CREATE INDEX "listening_histories_played_at_idx" ON "listening_histories"("played_at");

-- CreateIndex
CREATE INDEX "smart_queue_suggestions_user_id_idx" ON "smart_queue_suggestions"("user_id");

-- CreateIndex
CREATE INDEX "setlists_user_id_idx" ON "setlists"("user_id");

-- CreateIndex
CREATE INDEX "setlist_songs_setlist_id_idx" ON "setlist_songs"("setlist_id");

-- CreateIndex
CREATE UNIQUE INDEX "setlist_songs_setlist_id_song_id_key" ON "setlist_songs"("setlist_id", "song_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_user_id_key" ON "user_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "audio_settings_user_id_key" ON "audio_settings"("user_id");

-- CreateIndex
CREATE INDEX "voice_command_histories_user_id_idx" ON "voice_command_histories"("user_id");

-- CreateIndex
CREATE INDEX "voice_command_histories_timestamp_idx" ON "voice_command_histories"("timestamp");

-- CreateIndex
CREATE INDEX "playlist_songs_song_id_idx" ON "playlist_songs"("song_id");

-- CreateIndex
CREATE INDEX "playlists_user_id_idx" ON "playlists"("user_id");

-- CreateIndex
CREATE INDEX "playlists_is_public_idx" ON "playlists"("is_public");

-- CreateIndex
CREATE INDEX "playlists_user_id_created_at_idx" ON "playlists"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "songs_uploaded_by_created_at_idx" ON "songs"("uploaded_by", "created_at" DESC);

-- CreateIndex
CREATE INDEX "songs_genre_idx" ON "songs"("genre");

-- CreateIndex
CREATE INDEX "songs_artist_idx" ON "songs"("artist");

-- CreateIndex
CREATE INDEX "songs_title_idx" ON "songs"("title");

-- CreateIndex
CREATE INDEX "songs_popularity_idx" ON "songs"("popularity" DESC);

-- CreateIndex
CREATE INDEX "songs_play_count_idx" ON "songs"("play_count" DESC);

-- AddForeignKey
ALTER TABLE "setlist_songs" ADD CONSTRAINT "setlist_songs_setlist_id_fkey" FOREIGN KEY ("setlist_id") REFERENCES "setlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
