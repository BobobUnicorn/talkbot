import { addAudioEmoji, RawAudioEmoji, removeAudioEmoji } from '../managers/database.js';

export class AudioEmoji {
    #raw: RawAudioEmoji;
    constructor(raw: RawAudioEmoji) {
        this.#raw = raw;
    }

    apply(str: string) {
        throw new Error('to implement');
    }
}

export class AudioEmojis {
    #emoji: AudioEmoji[];
    #guildId: string;

    constructor(emoji: AudioEmoji[], guildId: string) {
        this.#emoji = emoji;
        this.#guildId = guildId;
    }

    async add(emoji: string, replacement: string) {
        const raw = await addAudioEmoji(this.#guildId, emoji, replacement);
        this.#emoji.push(new AudioEmoji(raw));
    }

    async remove(emoji: string) {
        const raw = await removeAudioEmoji(this.#guildId, emoji);
        this.#emoji.push(new AudioEmoji(raw));
    }
}
