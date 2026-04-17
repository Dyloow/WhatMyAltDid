-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "password_hash" TEXT,
    "username" TEXT,
    "battlenet_id" TEXT,
    "battletag" TEXT,
    "region" TEXT NOT NULL DEFAULT 'eu',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_characters" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "realm" TEXT NOT NULL,
    "realm_slug" TEXT NOT NULL,
    "region" TEXT NOT NULL DEFAULT 'eu',
    "class_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_characters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_battlenet_id_key" ON "users"("battlenet_id");

-- CreateIndex
CREATE UNIQUE INDEX "saved_characters_user_id_name_realm_slug_region_key" ON "saved_characters"("user_id", "name", "realm_slug", "region");

-- AddForeignKey
ALTER TABLE "saved_characters" ADD CONSTRAINT "saved_characters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
