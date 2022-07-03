import { Client, Permissions, Guild, GuildMember, TextBasedChannel, Intents } from 'discord.js';
import { config } from '../../config/config.js';
import * as common from './common.js';

class BotStuff {
    readonly bot: Client & { user: NonNullable<Client['user']> } = new Client({
        intents: [
            Intents.FLAGS.GUILDS,
            Intents.FLAGS.GUILD_MESSAGES,
            Intents.FLAGS.GUILD_MEMBERS,
            Intents.FLAGS.GUILD_VOICE_STATES,
        ],
    }) as Client & { user: NonNullable<Client['user']> };

    readonly config = config;

    connect() {
        this.bot.login(process.env.TOKEN);
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

export const botStuff = new BotStuff();
