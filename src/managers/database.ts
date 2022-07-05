import { AudioEmoji, PrismaClient } from '@prisma/client';
import { Snowflake } from 'discord.js';

const prisma = new PrismaClient();

export async function getGuildSettings(guildId: Snowflake) {
    return await prisma.guildSettings.findUnique({
        where: {
            guildId,
        },
        include: {
            audioEmoji: true,
            memberSettings: true,
        },
    });
}

export async function createGuildSettings(guildId: Snowflake) {
    return await prisma.guildSettings.create({
        data: {
            guildId,
        },
        include: {
            audioEmoji: true,
            memberSettings: true,
        },
    });
}

export async function getGuildStatistics(guildId: Snowflake, date: Date) {
    return await prisma.guildStatistics.findUnique({
        where: {
            guildId_date: {
                guildId,
                date,
            },
        },
    });
}

export async function getAllGuildStatistics(guildId: Snowflake) {
    return await prisma.guildStatistics.findMany({
        where: {
            guildId,
        },
    });
}

export async function getMemberSettings(guildId: Snowflake, memberId: Snowflake) {
    return await prisma.memberSettings.findUnique({
        where: {
            memberId_guildId: {
                memberId,
                guildId,
            },
        },
    });
}

export async function addAudioEmoji(
    guildId: Snowflake,
    emoji: string,
    replacement: string,
): Promise<AudioEmoji> {
    return await prisma.audioEmoji.upsert({
        create: {
            emoji,
            textReplacement: replacement,
            guildId,
        },
        update: {
            emoji,
            textReplacement: replacement,
            guildId,
        },
        where: {
            guildId_emoji: {
                guildId,
                emoji,
            },
        },
    });
}

export async function removeAudioEmoji(guildId: Snowflake, emoji: string): Promise<AudioEmoji> {
    return await prisma.audioEmoji.delete({
        where: {
            guildId_emoji: {
                guildId,
                emoji,
            },
        },
    });
}

export async function disconnect() {
    await prisma.$disconnect();
}

export type RawGuildSettings = NonNullable<Awaited<ReturnType<typeof getGuildSettings>>>;
export type RawGuildStatistics = NonNullable<Awaited<ReturnType<typeof getGuildStatistics>>>;
export type RawMemberSettings = NonNullable<Awaited<ReturnType<typeof getMemberSettings>>>;

export { AudioEmoji as RawAudioEmoji } from '@prisma/client';
