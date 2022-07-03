import { Snowflake } from 'discord.js';
import { getGuildStatistics, RawGuildStatistics } from '../managers/database.js';

/** Contains user and usage counts for a particular date for a particular guild. */
export class GuildStatistics {
    static async resolve(guildId: Snowflake, date: Date): Promise<GuildStatistics | null> {
        const rawStatistics = await getGuildStatistics(guildId, date);
        if (!rawStatistics) {
            return null;
        }
        return new GuildStatistics(rawStatistics);
    }

    get characterCount() {
        return this.raw.characterCount;
    }

    get wordCount() {
        return this.raw.wordCount;
    }

    get uniqueUsers() {
        return this.raw.uniqueUsers;
    }

    constructor(private readonly raw: RawGuildStatistics) {}
}
