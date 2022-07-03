import { botStuff } from '../helpers/bot-stuff.js';
import { GuildModel } from './guild.js';
import * as common from '../helpers/common.js';
import { config } from '../../config/config.js';
import { Guild, Snowflake } from 'discord.js';
import { commands } from '../commands/index.js';
const bot = botStuff.bot;

export class World {
    readonly #servers = new Map<Snowflake, GuildModel>();
    private presenceTimeout: ReturnType<typeof setTimeout> | null = null;
    readonly defaultTitle = 'master';

    /* * *
     * startup()
     *
     * Actions that run when the world object is created
     * * */
    startup() {
        bot.guilds.cache.forEach((guild) => this.addServer(guild));
        this.setPresence();
        this.startRebootTimer();
    }

    /* * *
     * addServer()
     *
     * Add a server to the world - pass Guild
     * * */
    addServer(guild: Guild) {
        this.servers.set(guild.id, new Server(guild, this));
        this.setPresence();
        common.out(guild.id + ': added to the world');
    }

    /* * *
     * removeServer()
     *
     * Remove a server from the world - pass Guild
     * * */
    removeServer(guild: Guild) {
        const server = this.servers.get(guild.id);

        if (!server) {
            return;
        }
        this.servers.delete(guild.id);
        this.setPresence();
        server.save();
        server.dispose();
        common.out(guild.id + ': removed from the world');
    }

    /* * *
     * setPresence()
     *
     * Set the bot's presence
     * * */
    setPresence() {
        const presenceTimer = () => {
            this.presenceTimeout = null;

            bot.user.setPresence({
                status: 'online',
                activities: [
                    {
                        name: this.renderPresenceHelp(),
                        type: 1,
                        url: 'https://github.com/BobobUnicorn/talkbot',
                    },
                ],
            });
        };

        // this protects against spamming discord with presence updates
        // and getting banned
        if (this.presenceTimeout) clearTimeout(this.presenceTimeout);
        this.presenceTimeout = setTimeout(presenceTimer, 50);
    }

    /* * *
     * renderPresenceHelp()
     *
     * Create a presence string
     * * */
    renderPresenceHelp() {
        return commands.command_char + `help for help!`;
    }

    /* * *
     * saveAll()
     *
     * Save the state of every server in the world
     * * */
    saveAll() {
        for (const [, server] of this.servers) {
            server.save();
        }
    }

    /* * *
     * releaseAll()
     *
     * Call release() on each server
     * * */
    releaseAll() {
        for (const [, server] of this.servers) {
            server.release();
        }
    }

    /* * *
     * kill()
     *
     * Attempts to shutdown gracefully - pass a reason
     * * */
    kill(reason: string) {
        if (reason) common.out('kill(): ' + reason);
        this.releaseAll();
        this.saveAll();
        bot.destroy();
        process.exit();
    }

    /* * *
     * getActiveServersCount()
     *
     * Gets the number of servers where someone is !following
     * * */
    getActiveServersCount() {
        return [...this.servers.values()].filter((server) => server.isBound()).length;
    }

    /* * *
     * startRebootTimer()
     *
     * When called sets the bot to automatically reboot when no one is using it
     * Its a hack to work around network bugs and so forth
     * * */
    startRebootTimer() {
        const rebootTimer = () => {
            if (this.getActiveServersCount() == 0) {
                this.kill('Inactivity reboot');
                return;
            }

            // if someone is using it it'll get here and we'll
            // check again in an hour to see if we can reboot it
            setTimeout(rebootTimer, 60 * 60 * 1000);
        };

        // kick off in 12 hours
        setTimeout(rebootTimer, 12 * 60 * 60 * 1000);
    }

    /* * *
     * dispose()
     *
     * Safely clean up any resources for this class
     * * */
    dispose() {
        for (const [, server] of this.servers) {
            server.dispose();
        }
    }
}

export const world = new World();
