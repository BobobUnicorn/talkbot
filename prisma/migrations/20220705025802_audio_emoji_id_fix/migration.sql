/*
  Warnings:

  - The primary key for the `AudioEmoji` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `AudioEmoji` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "AudioEmoji" DROP CONSTRAINT "AudioEmoji_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "AudioEmoji_pkey" PRIMARY KEY ("guildId", "emoji");
