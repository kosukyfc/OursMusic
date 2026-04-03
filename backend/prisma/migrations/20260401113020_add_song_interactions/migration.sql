-- CreateEnum
CREATE TYPE "LikeType" AS ENUM ('like', 'dislike');

-- CreateTable
CREATE TABLE "song_likes" (
    "user_id" TEXT NOT NULL,
    "song_id" TEXT NOT NULL,
    "type" "LikeType" NOT NULL DEFAULT 'like',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "song_likes_pkey" PRIMARY KEY ("user_id","song_id")
);

-- CreateTable
CREATE TABLE "song_comments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "song_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "song_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "song_likes_song_id_idx" ON "song_likes"("song_id");

-- CreateIndex
CREATE INDEX "song_comments_song_id_created_at_idx" ON "song_comments"("song_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "song_likes" ADD CONSTRAINT "song_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "song_likes" ADD CONSTRAINT "song_likes_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "songs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "song_comments" ADD CONSTRAINT "song_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "song_comments" ADD CONSTRAINT "song_comments_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "songs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
