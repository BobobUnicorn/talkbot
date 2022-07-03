import { Guild, GuildMember, Snowflake, VoiceChannel } from 'discord.js';
import {
    entersState,
    getVoiceConnection,
    joinVoiceChannel,
    VoiceConnection,
    VoiceConnectionStatus,
} from '@discordjs/voice';
import { World } from './world.js';
import Lang from 'lang.js';
import * as common from '../helpers/common.js';
import { botStuff } from '../helpers/bot-stuff.js';
import * as fs from 'fs/promises';
import * as paths from '../paths.js';
import { TextToSpeechService, TTSOptions, VoiceProviders } from '../services/textToSpeechService.js';
import { commands } from '../commands/index.js';
import { GuildSettings } from './guildSettings.js';
import { getConfig } from 'src/managers/config.js';
import { GuildStatistics } from './guildStatistics.js';

const config = await getConfig();

const TIMEOUT_NEGLECT = config.neglectTimeout;

const NEGLECT_TIMEOUT_MESSAGES = config.neglectTimeoutMessages;

export class GuildModel {
    private readonly settings: GuildSettings;
    private readonly stats: GuildStatistics;

    boundTo: GuildMember | null = null;
    // when bound this will include the master, !permit to add others
    readonly permitted: Set<Snowflake> = new Set();
    // created to timeout the !follow if the bot is not used
    private neglectTimeout: ReturnType<typeof setTimeout> | null = null;
    // bind talkbot to a autofollow joining people
    readonly bind: Snowflake[];
    // allow people to be auto permitted
    bindPermit: boolean;
    // queue for !keep
    readonly keepMessages: Snowflake[] = [];
    // when was this server last created in memory
    updated = new Date();
    // max number of chars this server can speak - to avoid spamming the APIs
    readonly charLimit: number;
    // access the lang file
    readonly commandResponses = new Lang({
        messages: Object.assign(require('@src/lang.json'), require('@config/lang.json')),
        locale: 'en',
        fallback: this.fallbackLang,
    });
    // idk??
    readonly messages: Record<string, string> = {};
    // whether or not we're currently leaving
    private leaving: boolean = false;
    // whether or not we're currently connecting
    private connecting: boolean = false;

    get id() {
        return this.discordGuild.id;
    }

    // create the server object
    constructor(readonly discordGuild: Guild, private readonly world: World) {}

    getMemberSettings(member: GuildMember) {
        return this.settings.memberSettings.get(member.id);
    }

    setMaster(member: GuildMember) {
        this.boundTo = member;
        this.permit(member.id);
        this.resetNeglectTimeout();
        this.save();
    }

    lang(key: string, params: Record<string, string>) {
        if (this.isLangKey(key)) {
            return this.messages[key];
        }

        if (!params) params = {};

        const command_char = commands.getCommandChar(this);
        const title = params.title || this.world.defaultTitle;

        params = {
            ...params,
            command_char,
            title,
        };

        return this.commandResponses.get.apply(this.commandResponses, [key, params]);
    }

    isLangKey(possible_key: string) {
        return this.messages && this.messages[possible_key];
    }

    isMaster(member: GuildMember) {
        return this.boundTo?.id == member.id;
    }

    // true if this server is bound to a user already
    isBound() {
        return this.boundTo != null;
    }

    // does this server think it's in a voice channel
    inChannel() {
        return !!this.discordGuild.me?.voice;
    }

    async release() {
        if (this.leaving) return; // dont call it twice dude
        await this.discordGuild.me?.voice?.disconnect();
        commands.notify('leaveVoice', { server: this });
    }

    // get the server to join a voice channel
    async joinVoiceChannel(voiceChannel: VoiceChannel) {
        if (this.connecting)
            return common.error('joinVoiceChannel(' + voiceChannel.id + '): tried to connect twice!');
        if (this.inChannel())
            return common.error(
                'joinVoiceChannel(' +
                    voiceChannel.id +
                    '): already joined to ' +
                    this.discordGuild.me?.voice?.channelId +
                    '!',
            );
        this.connecting = true;

        let connection: VoiceConnection;
        try {
            // join the voice channel and setup all the listeners to deal with events
            connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: this.discordGuild.id,
                adapterCreator: this.discordGuild.voiceAdapterCreator,
            });
        } catch (e: unknown) {
            this.stop('joinError');
            this.boundTo = null;
            this.permitted.clear();
            this.connecting = false;
            if (e instanceof Error) {
                common.error(e);
            }
            return false;
        }

        connection.on(VoiceConnectionStatus.Disconnected, async () => {
            try {
                await Promise.race([
                    entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                    entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
                ]);
                // Seems to be reconnecting to a new channel - ignore disconnect
            } catch (error) {
                // Seems to be a real disconnect which SHOULDN'T be recovered from
                connection.destroy();
                this.boundTo = null;
                this.permitted.clear();
                this.connecting = false;
                this.leaving = false;
                this.stop('disconnect'); // stop playing
                if (this.neglectTimeout) {
                    clearTimeout(this.neglectTimeout);
                }
            }
        });

        this.connecting = false;
        this.save();
        this.world.setPresence();
        commands.notify('joinVoice', { server: this });

        return connection;
    }

    // switch from whatever the current voice channel is to this voice channel
    async switchVoiceChannel(voiceChannel: VoiceChannel) {
        const conn = getVoiceConnection(this.discordGuild.id);
        if (!conn) return this.joinVoiceChannel(voiceChannel);
        if (voiceChannel.id === this.discordGuild.me?.voice.channelId)
            return common.error('voiceChannel already joined');

        joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: this.discordGuild.id,
            adapterCreator: this.discordGuild.voiceAdapterCreator,
        });
    }

    // permit another user to speak
    permit(id: Snowflake) {
        this.resetNeglectTimeout(); // this is redundant, its run from the command as well
        var member = this.discordGuild.members.cache.find((member) => member.id == snowflake_id);
        if (member) this.addMemberSetting(member, 'toLanguage', 'default');
        this.permitted.add(id);
        this.save();
    }

    // unpermit another user to speak
    unpermit(id: Snowflake) {
        this.resetNeglectTimeout(); // this is redundant, its run from the command as well
        this.permitted.delete(id);
        this.save();
    }

    // is this user permitted to speak
    isPermitted(member: GuildMember) {
        return (
            this.permitted.has(member.id) ||
            [...member.roles.cache.keys()].some((id) => this.permitted.has(id))
        );
    }

    // reset the timer that unfollows a user if they dont use the bot
    resetNeglectTimeout() {
        if (this.neglectTimeout) {
            clearTimeout(this.neglectTimeout);
        }
        if (TIMEOUT_NEGLECT > 0) {
            this.neglectTimeout = setTimeout(() => {
                this.neglected();
            }, TIMEOUT_NEGLECT);
        }
    }

    // called when the neglect timeout expires
    async neglected() {
        // delay for 3 seconds to allow the bot to talk

        if (this.inChannel()) {
            await this.talk(
                NEGLECT_TIMEOUT_MESSAGES[Math.floor(Math.random() * NEGLECT_TIMEOUT_MESSAGES.length)],
            );
            setTimeout(() => {
                common.out('neglected: in chan');
                this.release();
            }, 3000);
        } else {
            common.out('neglected: server.release() not in chan');
            this.release();
        }
    }

    // run this to cleanup resources before shutting down
    async shutdown() {
        common.out('shutdown(): ' + new Error().stack);
        if (this.inChannel()) {
            await this.talk('The server is shutting down');
        }
        this.release();
    }

    // when the server is deleted or shutdown or disconnected run this to cleanup things
    dispose() {
        this.shutdown();
        if (this.neglectTimeout) {
            clearTimeout(this.neglectTimeout);
        }
    }

    // save the state file
    async save(filename?: string) {
        this.updated = new Date();
        function replacer(key: string, value: string) {
            if (key.endsWith('_timeout')) return undefined; // these keys are internal timers that we dont want to save
            if (key == 'commandResponses') return undefined;
            if (key == 'bound_to') return undefined;
            if (key == 'world') return undefined;
            if (key == 'guild') return undefined;
            if (key == 'keepQueue') return undefined;
            if (key == 'switchQueue') return undefined;
            if (key == 'twitch') return undefined;
            else return value;
        }

        if (!filename) filename = paths.config + '/' + this.discordGuild.id + '.server';
        await fs.writeFile(filename, JSON.stringify(self, replacer), 'utf-8');
    }

    // load the state file
    async loadState() {
        const filename = paths.config + '/' + this.discordGuild.id + '.server';

        try {
            await fs.stat(filename);
            return JSON.parse(await fs.readFile(filename, 'utf8'));
        } catch (e: unknown) {
            return null;
        }
    }

    // speak a message in a voice channel - raw text
    async talk(message: string, options?: TTSOptions & { voiceProvider: VoiceProviders }) {
        if (!this.inChannel()) return;

        this.resetNeglectTimeout();

        const service = options?.voiceProvider
            ? TextToSpeechService.getService(options?.voiceProvider)
            : TextToSpeechService.defaultProvider;

        // Performs the Text-to-Speech request
        try {
            const audio = await service.getAudioContent(message, options);
            await this.playAudioContent(audio, service.format);
        } catch (e: unknown) {
            if (e instanceof Error) {
                common.error(e);
            }
        }
    }

    channelJoined(channelState: unknown) {
        commands.notify('userJoinedChannel', {
            channelState: channelState,
            member: channelState.member,
            server: this,
        });
    }

    // stop currently playing audio and empty the audio queue (all=true)
    stop(reason: string, all?: boolean) {
        if (all) {
            this.audioQueue = [];
        }
        const conn = getVoiceConnection(this.discordGuild.id);
        conn?.disconnect();
    }

    // internal function for playing audio content returned from the TTS API and queuing it
    async playAudioContent(audioContent: ReadableStream, format: string) {
        var endFunc = (reason) => {
            clearTimeout(server.voice_timeout);
            server.playing = false;
            if (server.guild.voice.connection.dispatcher)
                server.guild.voice.connection.dispatcher.setSpeaking(false);
            server.voice_timeout = null;
            try {
                callback();
            } catch (ex) {
                common.error(ex);
            }
            if (!server.audioQueue) return;
            var nextAudio = server.audioQueue.shift();
            if (reason != 'stream') {
                // if the stream hasn't ended normally
                server.audioQueue = [];
                common.error('Cancelled queue: ' + reason);
            } else if (nextAudio) nextAudio();
        };

        // queue it up if there's something playing
        // queueFunc is a call containing both the callback and the content
        if (this.playing) {
            if (!server.audioQueue) server.audioQueue = [];
            var queueFunc = () => server.playAudioContent(readable, format, callback);
            server.audioQueue.push(queueFunc);
            return;
        }

        if (server.leaving) return;
        if (!server.guild.voice.connection)
            return common.error(
                "Tried to play audio content when there's no voice connection. " + new Error().stack,
            );

        // play the content
        server.playing = true;
        clearTimeout(server.voice_timeout);
        server.voice_timeout = setTimeout(
            () =>
                server.guild.voice.connection.dispatcher
                    ? server.guild.voice.connection.dispatcher.end('timeout')
                    : null,
            60000,
        );

        try {
            server.guild.voice.connection
                .play(readable, { type: format })
                .on('finish', endFunc)
                .on('error', common.error);
        } catch (ex) {
            common.error(ex);
        }
    }

    // call this if you want to check a msg content is valid and run it through translation
    async speak(message: string) {
        var server = this;
        var settings = server.getMemberSettings(message.member);

        var ret = commands.notify('preValidate', {
            message: message,
            content: message.cleanContent,
            server: server,
        });

        if (
            ret === false ||
            message.cleanContent.length < 1 ||
            common.isMessageExcluded(message.cleanContent) ||
            !server.inChannel() ||
            !server.isPermitted(message.member) ||
            settings.muted
        )
            return;

        var accept = commands.notify('validate', {
            message: message,
            server: server,
        });

        if (accept === false) return; // nerf the message because it didnt validate

        var content = common.cleanMessage(message.cleanContent);

        var ret = commands.notify('message', {
            message: message,
            content: content,
            server: server,
        });
        if (ret) content = ret;

        if (content.length < 1) return;

        ret = commands.notify('configureVoice', {
            message: message,
            original_settings: settings,
            server: server,
        });
        if (ret) settings = ret;

        function _speak(msg, settings) {
            server.talk(msg, settings, () =>
                commands.notify('messageDelivered', {
                    message: message,
                    content: message.message,
                    server: server,
                }),
            );
        }

        var tolang = server.getMemberSetting(message.member, 'toLanguage');
        if (tolang && tolang != 'default') {
            botStuff.translate_client
                .translate(content, tolang)
                .then((results) => {
                    _speak(results[0], settings);
                })
                .catch(common.error);
        } else {
            _speak(content, settings);
        }
    }
}
