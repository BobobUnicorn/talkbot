import { RawAudioEmoji } from '../managers/database.js';

export class AudioEmoji {
    constructor(private readonly raw: RawAudioEmoji) {}

    apply(str: string) {
        throw new Error('to implement');
    }
}
