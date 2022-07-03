/*
 *  _____     _ _    ____        _
 * |_   _|_ _| | | _| __ )  ___ | |_
 *   | |/ _` | | |/ /  _ \ / _ \| __|
 *   | | (_| | |   <| |_) | (_) | |_
 *   |_|\__,_|_|_|\_\____/ \___/ \__|
 *
 * A discord text to speech bot
 *
 * http://github.com/nullabork/talkbot
 */

import { commands } from './commands/index.js';
import figlet from 'figlet';
import * as common from './helpers/common.js';
import { Bot } from './managers/bot.js';
import { logger } from './helpers/logger.js';

const bot = new Bot();

// runtime testing
await testing.TestIfTTSAPIServicesAreConfigured();

// FANCY SPLASH SCREEN
figlet('TalkBot', (err, data) => logger.info(data));

// when the server is ready to go
bot.on('ready', () => {
    common.out('Logged in as: ' + bot.user.username + ' - (' + bot.user.id + ')');
    common.error('LOG CHECKPOINT: THE BOT STARTED. THIS IS NOT AN ERROR MESSAGE');
    world.startup();
});

// when the bot is added to new servers
bot.on('guildCreate', (guild) => {
    try {
        //add the relationships
        world.addServer(guild);
    } catch (ex) {
        common.error(ex);
    }
});

// when the bot is removed from servers
bot.on('guildDelete', (guild) => {
    try {
        world.removeServer(guild);
    } catch (ex) {
        common.error(ex);
    }
});

// when a member is removed unfollow
bot.on('guildMemberRemove', (member) => {
    try {
        const server = world.servers[member.guild.id];
        if (server.isMaster(member)) {
            server.release();
        }
    } catch (ex) {
        common.error(ex);
    }
});

// handle voice state updates
bot.on('voiceStateUpdate', (oldState, newState) => {
    try {
        const server = world.servers[oldState.guild.id];
        server.channelJoined(newState);

        if (!oldState) return;
        if (!server.isMaster(oldState.guild.members.cache.get(oldState.id))) return;

        // they've changed voice channels
        if (
            oldState.channelID &&
            (!newState.channelID || !newState.guild.channels.cache.get(newState.channelID).joinable)
        ) {
            server.release();
        } else if (oldState.channelID && newState.channelID && oldState.channelID != newState.channelID) {
            server.switchVoiceChannel(newState.guild.channels.cache.get(newState.channelID));
        }
    } catch (ex) {
        common.error(ex);
    }
});

// when messages come in
bot.on('message', (message) => {
    try {
        // ignore message from myself
        if (message.member && message.member.id == bot.user.id) return;

        let server = null;

        // if its in a server and not a DM
        if (message.guild) {
            server = world.servers[message.guild.id];

            if (server == null) {
                common.error("Can't find server for guild id: " + message.guild.id);
                return null;
            }
        }

        // is the message a command?
        if (commands.isCommand(message, server)) {
            commands.process(message, server, world);
        } else if (message.member) {
            // say it out loud
            server.speak(message);
        }
    } catch (ex) {
        common.error(ex);
    }
});

// if we get disconnected???
bot.on('shardDisconnect', (evt, shardID) => {
    try {
        world.saveAll();
        world.dispose();
        common.out(`Shard ${shardID} Disconnected, reconnecting`);
        common.out(evt);
        botStuff.connect();
    } catch (ex) {
        common.error(ex);
    }
});

// capture a whole pile of useful information
bot.on('error', common.error);
bot.on('guildUnavailable', (guild) => common.error('guild unavailable: ' + guild.id));
bot.on('rateLimit', (info) => {
    common.error('rate limited');
    common.error(info);
});
bot.on('shardResume', (replayed, shardID) => common.error(`resume ${shardID}: ` + replayed));
bot.on('warn', (info) => common.error('warn:' + info));

bot.on('shardReconnecting', (id) => common.error(`Shard with ID ${id} reconnected.`));

// ctrl-c
process.on('SIGINT', () => world.kill('SIGINT'));

// something goes wrong we didnt think of or having got around to putting a band-aid fix on
process.on('uncaughtException', (err) => {
    common.error(err);
    world.kill('uncaughtException: ' + err.message);
});

// start it up!
botStuff.connect();
