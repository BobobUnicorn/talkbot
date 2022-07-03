import {
    Client,
    Permissions,
    Guild,
    GuildMember,
    TextBasedChannel,
    Intents,
    Snowflake,
    PartialGuildMember,
} from 'discord.js';
import { GuildModel } from 'src/models/guild.js';
import { GuildSettings } from 'src/models/guildSettings.js';
import { GuildStatistics } from 'src/models/guildStatistics.js';
import * as common from './common.js';
import { getConfig } from './config.js';
import { getAllGuildStatistics, getGuildSettings } from './database.js';

const config = await getConfig();

export class Bot {
    readonly #client = new Client({
        intents: [
            Intents.FLAGS.GUILDS,
            Intents.FLAGS.GUILD_MESSAGES,
            Intents.FLAGS.GUILD_MEMBERS,
            Intents.FLAGS.GUILD_VOICE_STATES,
        ],
    }) as Client & { user: NonNullable<Client['user']> };

    #guilds = new Map<Snowflake, GuildModel>();

    connect() {
        this.#client.on('ready', () => {
            this.#loadAllGuilds();
        });

        this.#client.on('guildCreate', (guild) => {
            this.#setupNewGuild(guild);
        });

        this.#client.on('guildDelete', (guild) => {
            this.#unregisterGuild(guild);
        });

        this.#client.on('guildMemberRemove', (member) => {
            this.#releaseIfBoundTo(member);
        });

        this.#client.on('voiceStateUpdate', (oldState, newState) => {
            this.#followIfBoundTo(oldState, newState);
        });

        this.#client.on('message', (message) => {
            this.#processMessage(message);
        });

        this.#client.on('shardDisconnect', () => {
            this.#reconnect();
        });

        this.#client.login(config.auth.botToken);
    }

    async #loadAllGuilds() {
        const loading = [];
        for (const [id, guild] of this.#client.guilds.cache) {
            loading.push(this.#loadGuild(id, guild));
        }
        const loadedGuilds = await Promise.all(loading);
        for (const guild of loadedGuilds) {
            this.#guilds.set(guild.id, guild);
        }
    }

    async #loadGuild(id: Snowflake, guild: Guild) {
        const [settings, stats] = await Promise.all([getGuildSettings(id), getAllGuildStatistics(id)]);

        return new GuildModel(
            guild,
            settings && new GuildSettings(settings),
            stats.map((stats) => new GuildStatistics(stats)),
        );
    }

    async #setupNewGuild(guild: Guild) {
        this.#guilds.set(guild.id, new GuildModel(guild, null, []));
    }

    async #unregisterGuild(guild: Guild) {
        const guildModel = this.#guilds.get(guild.id);
        if (guildModel) {
            guildModel.unregister();
        }
        this.#guilds.delete(guild.id);
    }

    async #releaseIfBoundTo(member: GuildMember|PartialGuildMember) {
        const guild = this.#guilds.get(member.guild.id);
        guild?.releaseIfBoundTo(member);
    }

    async #followIfBoundTo(member: GuildMember|PartialGuildMember) {
        const guild = this.#guilds.get(member.guild.id);
        guild?.releaseIfBoundTo(member);
    }

    async #processMessage() {

    }

    isServerOwner(server: Guild, member: GuildMember) {
        return server.ownerId == member.id;
    }

    // determines if the user can manage this server
    canManageTheServer(server: Guild, member: GuildMember) {
        return (
            member.permissions.has(Permissions.FLAGS.ADMINISTRATOR) ||
            member.permissions.has(Permissions.FLAGS.MANAGE_GUILD) ||
            this.isServerOwner(server, member)
        );
    }
    //
    //     // determines if a member can manage the bot
    //     canManageTheBot(server: Guild, member: GuildMember) {
    //         if (!server.adminrole) return false;
    //         const rtn = member.roles.has(server.adminrole);
    //         return rtn;
    //     }

    botHasManageMessagePermissions(guild: Guild) {
        let botMember = guild.members.cache.find((x) => x.id == this.bot.user?.id);
        if (!botMember) return common.error(new Error('Cant find the member object for this bot')); // something went wrong!

        return botMember.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES, true);
    }

    async sendMessage(channel: TextBasedChannel, message: string) {
        await channel.sendTyping();
        await channel.send({
            content: message,
        });
    }
}
