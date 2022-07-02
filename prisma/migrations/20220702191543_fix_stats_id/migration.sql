/*
  Warnings:

  - The primary key for the `GuildStatistics` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropIndex
DROP INDEX "GuildStatistics_guildId_date_key";

-- AlterTable
ALTER TABLE "GuildStatistics" DROP CONSTRAINT "GuildStatistics_pkey",
ADD CONSTRAINT "GuildStatistics_pkey" PRIMARY KEY ("guildId", "date");
