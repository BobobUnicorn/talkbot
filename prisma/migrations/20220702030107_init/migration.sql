-- CreateTable
CREATE TABLE "MemberSettings" (
    "memberId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "gender" TEXT,
    "language" TEXT,
    "voice" TEXT,
    "pitchAdjustment" INTEGER,
    "speed" INTEGER,
    "title" TEXT,
    "prefix" TEXT,

    CONSTRAINT "MemberSettings_pkey" PRIMARY KEY ("memberId","guildId")
);

-- CreateTable
CREATE TABLE "AudioEmoji" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "textReplacement" TEXT NOT NULL,

    CONSTRAINT "AudioEmoji_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildSettings" (
    "guildId" TEXT NOT NULL,
    "prefix" TEXT,
    "adminRoles" TEXT[],
    "defaultLanguage" TEXT,
    "joinDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "following" TEXT[],
    "permitted" TEXT[],

    CONSTRAINT "GuildSettings_pkey" PRIMARY KEY ("guildId")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuildSettings_guildId_key" ON "GuildSettings"("guildId");

-- AddForeignKey
ALTER TABLE "MemberSettings" ADD CONSTRAINT "MemberSettings_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "GuildSettings"("guildId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudioEmoji" ADD CONSTRAINT "AudioEmoji_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "GuildSettings"("guildId") ON DELETE RESTRICT ON UPDATE CASCADE;
