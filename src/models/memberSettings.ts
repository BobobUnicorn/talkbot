import { Snowflake } from 'discord.js';
import { getMemberSettings, RawMemberSettings } from '../managers/database.js';

export class MemberSettings {
    static async resolve(guildId: Snowflake, memberId: Snowflake): Promise<MemberSettings | null> {
        const rawSettings = await getMemberSettings(guildId, memberId);
        if (!rawSettings) {
            return null;
        }
        return new MemberSettings(rawSettings);
    }

    get gender() {
        return this.raw.gender;
    }

    get language() {
        return this.raw.language;
    }

    get voice() {
        return this.raw.voice;
    }

    get pitchAdjustment() {
        return this.raw.pitchAdjustment;
    }

    get speed() {
        return this.raw.speed;
    }

    get title() {
        return this.raw.title;
    }

    get prefix() {
        return this.raw.prefix;
    }

    constructor(private readonly raw: RawMemberSettings) {}
}
