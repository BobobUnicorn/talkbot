/*
  Warnings:

  - You are about to drop the column `joinDate` on the `GuildSettings` table. All the data in the column will be lost.
  - You are about to drop the column `permitted` on the `GuildSettings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "GuildSettings" DROP COLUMN "joinDate",
DROP COLUMN "permitted",
ADD COLUMN     "permittedMembers" TEXT[],
ADD COLUMN     "permittedRoles" TEXT[],
ADD COLUMN     "ttsPermittedChannels" TEXT[];

-- CreateTable
CREATE TABLE "GuildStatistics" (
    "guildId" TEXT NOT NULL,
    "characterCount" INTEGER NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "uniqueUsers" INTEGER[],
    "date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildStatistics_pkey" PRIMARY KEY ("guildId")
);

-- CreateTable
CREATE TABLE "Guild" (
    "guildId" TEXT NOT NULL,
    "joinDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Guild_pkey" PRIMARY KEY ("guildId")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuildStatistics_guildId_date_key" ON "GuildStatistics"("guildId", "date");

-- AddForeignKey
ALTER TABLE "GuildStatistics" ADD CONSTRAINT "GuildStatistics_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("guildId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildSettings" ADD CONSTRAINT "GuildSettings_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("guildId") ON DELETE RESTRICT ON UPDATE CASCADE;
