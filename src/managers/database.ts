import { PrismaClient } from '@prisma/client';
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

export async function disconnect() {
    await prisma.$disconnect();
}

type RawGuildSettings = NonNullable<Awaited<ReturnType<typeof getGuildSettings>>>;
type RawMemberSettings = NonNullable<Awaited<ReturnType<typeof getMemberSettings>>>;

export { RawMemberSettings, RawGuildSettings };
export { AudioEmoji as RawAudioEmoji } from '@prisma/client';
