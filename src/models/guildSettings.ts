import { Snowflake } from 'discord.js';
import { getGuildSettings, RawGuildSettings } from '../managers/database.js';
import { AudioEmoji } from './audioEmoji.js';
import { MemberSettings } from './memberSettings.js';

/** User-controlled settings for a particular guild. */
export class GuildSettings {
    static async resolve(guildId: Snowflake): Promise<GuildSettings | null> {
        const rawSettings = await getGuildSettings(guildId);
        if (!rawSettings) {
            return null;
        }
        return new GuildSettings(rawSettings);
    }

    private readonly memberSettingModels = new Map(
        this.raw.memberSettings.map((settings) => [settings.memberId, new MemberSettings(settings)]),
    );
    private readonly audioEmojiModels = this.raw.audioEmoji.map((audioEmoji) => new AudioEmoji(audioEmoji));

    get prefix() {
        return this.raw.prefix;
    }

    get adminRoles() {
        return this.raw.adminRoles;
    }

    get audioEmoji(): ReadonlyArray<AudioEmoji> {
        return this.audioEmojiModels;
    }

    get memberSettings(): ReadonlyMap<Snowflake, MemberSettings> {
        return this.memberSettingModels;
    }

    get defaultLanguage() {
        return this.raw.defaultLanguage;
    }

    get following() {
        return this.raw.following;
    }

    get permitted() {
        return [...this.raw.permittedMembers, ...this.raw.permittedRoles];
    }

    get ttsPermittedChannels() {
        return this.raw.ttsPermittedChannels;
    }

    constructor(private readonly raw: RawGuildSettings) {}
}
