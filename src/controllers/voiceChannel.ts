import {
    AudioPlayerStatus,
    createAudioPlayer,
    createAudioResource,
    entersState,
    getVoiceConnection,
    joinVoiceChannel,
    NoSubscriberBehavior,
    StreamType,
    VoiceConnection,
    VoiceConnectionDisconnectReason,
    VoiceConnectionStatus,
} from '@discordjs/voice';
import translate from '@google-cloud/translate';
import { GuildMember, Message, VoiceChannel } from 'discord.js';
import { getConfig } from '../managers/config.js';
import { logger } from '../helpers/logger.js';
import { GuildModel } from '../models/guild.js';
import { TextToSpeechService, TTSOptions, VoiceProviders } from '../services/textToSpeechService.js';
import { cleanMessage } from 'src/helpers/common.js';
import { Readable } from 'node:stream';

const config = await getConfig();

const NEGLECT_TIMEOUT = config.neglectTimeout;
const NEGLECT_TIMEOUT_MESSAGES = config.neglectTimeoutMessages;

const STATE_CHANGE_TIMEOUT = 5 * 1000; // 5 seconds

const FALLBACK_LANGUAGE = 'en';
const FALLBACK_GENDER = 'FEMALE';

export interface TalkOptions extends TTSOptions {
    voiceProvider?: VoiceProviders;
}

async function destroyIfNotReconnecting(conn: VoiceConnection) {
    try {
        await Promise.race([
            entersState(conn, VoiceConnectionStatus.Signalling, STATE_CHANGE_TIMEOUT),
            entersState(conn, VoiceConnectionStatus.Connecting, STATE_CHANGE_TIMEOUT),
        ]);
        // Seems to be reconnecting to a new channel - ignore disconnect
    } catch (error) {
        // Seems to be a real disconnect which SHOULDN'T be recovered from
        conn.destroy();
    }
}

function rand<T>(arr: T[]): T {
    return arr[(Math.random() * arr.length) | 0];
}

const translateClient = new translate.v2.Translate({
    projectId: process.env.GCLOUD_PROJECT_ID,
});

class Queue {
    #running = false;
    #queue: Array<() => Promise<void>> = [];

    add(fn: () => Promise<void>) {
        this.#queue.push(fn);
        this.#startQueue();
    }

    #startQueue() {
        if (this.#running) {
            return;
        }
        this.#running = true;
        this.#execQueue();
    }

    async #execQueue() {
        const first = this.#queue.shift();
        if (!first) {
            this.#running = false;
            return;
        }
        await first();
        await this.#execQueue();
    }
}

export class VoiceChannelController {
    #neglectTimeout: ReturnType<typeof setTimeout> | null = null;
    #audioQueue = new Queue();
    #player = createAudioPlayer({
        behaviors: {
            noSubscriber: NoSubscriberBehavior.Play,
        },
    });

    constructor(private readonly guild: GuildModel) {}

    async join(vc: VoiceChannel) {
        const existingConn = getVoiceConnection(this.guild.id);
        if (existingConn?.joinConfig.channelId === vc.id) {
            logger.info('attempted to join channel twice', { voiceChannelId: vc.id });
            return;
        }

        const conn = joinVoiceChannel({
            channelId: vc.id,
            guildId: this.guild.id,
            adapterCreator: this.guild.discordGuild.voiceAdapterCreator,
        });

        conn.on(VoiceConnectionStatus.Disconnected, () => {
            void destroyIfNotReconnecting(conn);
        });

        try {
            await entersState(conn, VoiceConnectionStatus.Ready, STATE_CHANGE_TIMEOUT);
            conn.subscribe(this.#player);
        } catch (e: unknown) {
            conn.destroy();
            logger.error('failure on joining channel', {
                voiceChannelId: vc.id,
                error: e,
            });
            throw e;
        }
    }

    async disconnect() {
        const conn = getVoiceConnection(this.guild.id);
        if (!conn) {
            return;
        }

        this.#neglectTimeout && clearTimeout(this.#neglectTimeout);
        conn.destroy();
        try {
            await entersState(conn, VoiceConnectionStatus.Destroyed, STATE_CHANGE_TIMEOUT);
        } catch (e: unknown) {
            logger.error('failure to disconnect from channel', {
                voiceChannelId: conn.joinConfig.channelId,
                error: e,
            });
            throw e;
        }
    }

    /**
     * Speaks a message in either string or Message form.
     *
     * If a Message is provided, we'll automatically determine the best voice
     * provider and translate it if needed.
     */
    async talk(message: string | Message<true>, options?: TalkOptions) {
        const conn = getVoiceConnection(this.guild.id);
        if (!conn) {
            return;
        }

        let service;
        if (message instanceof Message) {
            service = this.#getSpeechService(message.member, options?.voiceProvider);
            message = await this.#convertMessage(message);
        } else {
            service = options?.voiceProvider
                ? TextToSpeechService.getService(options.voiceProvider)
                : TextToSpeechService.defaultProvider;
        }

        this.#resetNeglectTimeout();

        // Performs the Text-to-Speech request
        try {
            const audio = await service.getAudioContent(message, options);
            await this.playRawAudio(audio, conn);
        } catch (e: unknown) {
            logger.error('failure to disconnect from channel', {
                voiceChannelId: conn.joinConfig.channelId,
                error: e,
            });
        }
    }

    async playRawAudio(
        audioContent: Readable | Buffer,
        conn: VoiceConnection | undefined = getVoiceConnection(this.guild.id),
    ) {
        if (!conn) {
            return;
        }

        this.#audioQueue.add((): Promise<void> => {
            if (Buffer.isBuffer(audioContent)) {
                audioContent = Readable.from(audioContent);
            }
            this.#player.play(createAudioResource(audioContent, { inputType: StreamType.Opus }));
            return new Promise((resolve) => {
                this.#player.once(AudioPlayerStatus.Idle, () => {
                    resolve();
                });
            });
        });
    }

    async #convertMessage(message: Message) {
        const content = cleanMessage(message.cleanContent);
        if (!message.member) {
            return content;
        }
        const settings = this.guild.getMemberSettings(message.member);
        if (settings?.translateLanguage) {
            const [translationResult] = await translateClient.translate(content, settings.translateLanguage);
            return translationResult;
        }
        return content;
    }

    #getSpeechService(member: GuildMember | null, override?: VoiceProviders) {
        const settings = member && this.guild.getMemberSettings(member);
        const voice = settings?.voice;
        const language = settings?.language ?? FALLBACK_LANGUAGE;
        const gender = settings?.gender ?? FALLBACK_GENDER;
        if (voice) {
            return TextToSpeechService.getSpeechService({
                provider: override,
                voice,
            });
        }
        return TextToSpeechService.getSpeechService({
            provider: override,
            language,
            gender,
        });
    }

    #resetNeglectTimeout() {
        if (this.#neglectTimeout) {
            clearTimeout(this.#neglectTimeout);
        }
        if (NEGLECT_TIMEOUT > 0) {
            this.#neglectTimeout = setTimeout(() => {
                this.#disconnectOnNeglect();
            }, NEGLECT_TIMEOUT);
        }
    }

    async #disconnectOnNeglect() {
        logger.info('disconnecting due to neglect', { voiceChannelId: this.guild.discordGuild.me?.voice.id });
        this.#neglectTimeout && clearTimeout(this.#neglectTimeout);
        await this.talk(rand(NEGLECT_TIMEOUT_MESSAGES));
        this.disconnect();
    }
}
