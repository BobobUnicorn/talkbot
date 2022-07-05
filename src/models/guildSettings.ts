import { Snowflake } from 'discord.js';
import { createGuildSettings, getGuildSettings, RawGuildSettings } from '../managers/database.js';
import { AudioEmoji, AudioEmojis } from './audioEmoji.js';
import { MemberSettings } from './memberSettings.js';

/** User-controlled settings for a particular guild. */
export class GuildSettings {
    static async resolve(guildId: Snowflake): Promise<GuildSettings> {
        let rawSettings = await getGuildSettings(guildId);
        if (!rawSettings) {
            rawSettings = await createGuildSettings(guildId);
        }
        return new GuildSettings(rawSettings);
    }

    readonly #raw: RawGuildSettings;
    readonly #audioEmoji: AudioEmojis;
    readonly #memberSettingModels: ReadonlyMap<Snowflake, MemberSettings>;

    get prefix() {
        return this.#raw.prefix;
    }

    get adminRoles() {
        return this.#raw.adminRoles;
    }

    get audioEmoji(): AudioEmojis {
        return this.#audioEmoji;
    }

    get memberSettings(): ReadonlyMap<Snowflake, MemberSettings> {
        return this.#memberSettingModels;
    }

    get defaultLanguage() {
        return this.#raw.defaultLanguage;
    }

    get following() {
        return this.#raw.following;
    }

    get permitted() {
        return [...this.#raw.permittedMembers, ...this.#raw.permittedRoles];
    }

    get ttsPermittedChannels() {
        return this.#raw.ttsPermittedChannels;
    }

    constructor(raw: RawGuildSettings) {
        this.#raw = raw;
        this.#memberSettingModels = new Map(
            this.#raw.memberSettings.map((settings) => [settings.memberId, new MemberSettings(settings)]),
        );
        this.#audioEmoji = new AudioEmojis(
            this.#raw.audioEmoji.map((audioEmoji) => new AudioEmoji(audioEmoji)),
            this.#raw.guildId,
        );
    }
}
