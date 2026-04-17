-- CreateTable
CREATE TABLE "family_groups" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "family_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_members" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "family_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "family_groups_owner_id_key" ON "family_groups"("owner_id");
CREATE UNIQUE INDEX "family_members_group_id_user_id_key" ON "family_members"("group_id", "user_id");
CREATE INDEX "family_members_user_id_idx" ON "family_members"("user_id");

-- AddForeignKey
ALTER TABLE "family_groups" ADD CONSTRAINT "family_groups_owner_id_fkey"
    FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "family_members" ADD CONSTRAINT "family_members_group_id_fkey"
    FOREIGN KEY ("group_id") REFERENCES "family_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "family_members" ADD CONSTRAINT "family_members_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
