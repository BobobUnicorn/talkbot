import * as common from '../helpers/common.js';
import * as fs from 'fs/promises';
import * as paths from '../paths.js';
import { logger } from '../helpers/logger.js';

export interface TTSOptions {
    name: string;
    pitch: string;
    speed: string;
}

export type VoiceProviders = 'google' | 'amazon' | 'polly';

interface VoiceSpeechServiceOptions {
    voice: string;
    provider?: VoiceProviders;
}

interface LanguageGenderSpeechServiceOptions {
    language: string;
    gender: string;
    provider?: VoiceProviders;
}

export type SpeechServiceOptions = VoiceSpeechServiceOptions | LanguageGenderSpeechServiceOptions;

const ALL_SERVICES: readonly TextToSpeechService[] = [];

// base class for building specific TTS APIs over
export abstract class TextToSpeechService {
    // name of the service - eg. google, amazon, azure, watson
    get shortname() {
        logger.error('Please implement the shortname property');
        return 'unset';
    }

    // is this API enabled
    get enabled() {
        return true;
    }

    // get the char limit for this service
    get limit() {
        return 4 * 1000 * 1000;
    }

    get format() {
        return 'ogg';
    }

    /**
     * [startupTests to check things this API needs to operate]
     *
     * Should throw an error if this is not configured correctly.
     */
    abstract startupTests(): void;

    /**
     * [getAudioContent from the underlying API]
     */
    abstract getAudioContent(message: string, settings?: TTSOptions): Promise<ReadableStream>;

    /**
     * [getVoices get the voice configurations available from this service]
     */
    abstract getVoices(): Set<string>;

    /**
     * [getDefaultVoice gets the default voice name for this service]
     */
    abstract getDefaultVoice(gender: string, langCode: string): string;

    /**
     * [getDefaultVoice gets the default voice name for this service]
     */
    abstract getRandomVoice(gender: string, langCode: string): string;

    /**
     * [checkVoiceStructure confirm the voices array is formed correctly]
     *
     * @param  {*}  voices
     */
    static checkVoiceStructure(voices) {
        for (var index in voices) {
            // the two iso639 codes need a map to 3166 we can't enable these tests on production until this works
            var voice = voices[index];
            if (!voice.voice_alias) throw new Error('No voice_alias property:' + voice.voice);
            if (voice.gender != 'MALE' && voice.gender != 'FEMALE')
                throw new Error('Invalid gender property: ' + voice.gender);
            if (!voice.provider) throw new Error('No provider property');
            if (!voice.language) throw new Error('No language property');
            if (!voice.translate) throw new Error('No translate property');
            //if ( !iso639.iso_639_1[voice.translate]) throw new Error('Invalid translate ISO-639-1 code: "' + voice.translate + '"');
            if (!voice.voice) throw new Error('No voice property');
            if (!voice.code) throw new Error('No code property');
            //if ( !iso639.iso_639_1[voice.code.substring(0,2)]) throw new Error('Invalid code part ISO-639-1 code: "' + voice.code.substring(0,2) + '". Expected Form: [ISO-639-1 code]-[ISO-3166-1 country code]');
        }
    }

    /**
     * Checks the provider meets the contract
     *
     * @param {[TextToSpeechService]} provider
     */
    static checkProviderContract(provider) {
        if (
            provider.format != 'pcm' &&
            provider.format != 'ogg' &&
            provider.format != 'ogg_vorbis' &&
            provider.format != 'mp3' &&
            provider.format != 'ogg/opus' &&
            provider.format != 'opus'
        )
            throw new Error('Unknown provider format');
        if (!provider.shortname) throw new Error('Provider shortname needs to be set');

        var voices = provider.getVoices();
        if (voices.filter((voice) => voice.provider != provider.shortname).length > 0)
            throw new Error('A voice has an incorrect provider string');
        TextToSpeechService.checkVoiceStructure(voices);

        // run a bunch of tests of the methods to see if we can fail them
        provider.getDefaultVoice('FEMALE', 'en-US');
        provider.buildRequest('', {}, {});
        fs.writeFileSync(provider.shortname + '.json', JSON.stringify(voices), 'utf-8');
    }

    // get the first provider
    static get defaultProvider() {
        return TextToSpeechService.providers[
            Object.keys(TextToSpeechService.providers).filter(
                (x) => TextToSpeechService.providers[x].enabled,
            )[0]
        ];
    }

    static async setupProviders() {
        TextToSpeechService.providers = {};
        let files = fs.readdirSync(paths.tts);

        for (let file of files) {
            try {
                var api = require(paths.tts + '/' + file);
                var obj = new api();
                if (obj.enabled) {
                    await obj.startupTests();
                    await TextToSpeechService.checkProviderContract(obj);
                    TextToSpeechService.providers[obj.shortname] = obj;
                }
            } catch (err: unknown) {
                common.error('Error loading: ' + file);
                if (err instanceof Error) {
                    common.error(err);
                }
                process.exit(1);
            }
        }
    }

    /**
     * [getService find the API based on the member's settings]
     */
    static getService(provider: VoiceProviders): TextToSpeechService | null {
        return TextToSpeechService.providers[provider];
        return service;
    }

    /**
     * [Tests if the lang_code is valid]
     *
     * @param {*} lang_code - ISO language code
     * @param {*} provider  - optional provider name eg. google
     *
     * @returns {boolean}
     */
    static isValidLang(lang_code, provider) {
        return TextToSpeechService.getVoiceRecords(lang_code, provider).length > 0;
    }

    static getVoiceRecords(lang_code, provider) {
        if (provider) {
            service = TextToSpeechService.getService(provider);
            var voices = service
                .getVoices()
                .filter((voice) => voice.code.toLowerCase().indexOf(lang_code.toLowerCase()) > -1);
            return voices;
        } else {
            var v = [];
            for (var provider in TextToSpeechService.providers) {
                TextToSpeechService.providers[provider]
                    .getVoices()
                    .filter((voice) => voice.code.toLowerCase().indexOf(lang_code.toLowerCase()) > -1)
                    .forEach((voice) => v.push(voice));
            }
            return v;
        }
    }

    static getRandomProvider() {
        var r = Math.random() * 100000;
        return TextToSpeechService.providers[r % Object.keys(TextToSpeechService.providers).length];
    }

    static getVoice(voice_name, provider) {
        var v = null;
        var service = null;
        voice_name = voice_name.toLowerCase();

        if (provider) service = TextToSpeechService.getService(provider);

        if (service) {
            const voices = service.getVoices();
            for (let key in voices) {
                v = voices[key];
                if (v.voice.toLowerCase() == voice_name || v.voice_alias.toLowerCase() == voice_name)
                    return v;
            }
        } else {
            for (let service in TextToSpeechService.providers) {
                let voices = TextToSpeechService.providers[service].getVoices();
                for (let key in voices) {
                    v = voices[key];
                    if (v.voice.toLowerCase() == voice_name || v.voice_alias.toLowerCase() == voice_name)
                        return v;
                }
            }
        }
        return null;
    }

    static #resolveProvider(options: SpeechServiceOptions) {
        for (const service of ALL_SERVICES) {
            if ('voice' in options && service.getVoices().has(options.voice)) {
                return { service, voice: options.voice };
            } else if ('language' in options && 'gender' in options) {
                const voice = service.getRandomVoice(options.language, options.gender);
                if (voice) {
                    return { service, voice };
                }
            }
        }
        return { service: null, voice: null };
    }

    static getSpeechService(options: SpeechServiceOptions) {
        let service: TextToSpeechService | null;
        let voice: string | null;
        if (!options.provider) {
            ({ service, voice } = TextToSpeechService.#resolveProvider(options));
        } else {
            service = TextToSpeechService.getService(options.provider);
            if ('voice' in options) {
                voice = options.voice;
            } else {
                voice = service?.getRandomVoice(options.language, options.gender) ?? null;
            }
        }
        return {
            service,
            voice,
        };
    }
}
