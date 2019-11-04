/*jshint esversion: 9 */
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
(async () => {
  //npm imports
  require('module-alias/register');

  //helpers
  var commands = require('@commands'),
    figlet = require('figlet'),
    botStuff = require('@helpers/bot-stuff'),
    Common = require('@helpers/common'),
    testing = require('@helpers/runtime-testing');

  //models
  var world = require('@models/World');

  var bot = botStuff.bot;

  // runtime testing
  testing.TestIfChildProcessIsWorkingHowDiscordJSNeedsItTo();
  await testing.TestIfTTSAPIServicesAreConfigured();
  testing.TestIfNodeOpusIsInstalled();

  // FANCY SPLASH SCREEN
  figlet('TalkBot', (err, data) => console.log(data));

  // when the server is ready to go
  bot.on('ready', () => {
    Common.out('Logged in as: ' + bot.user.username + ' - (' + bot.user.id + ')');
    Common.error('LOG CHECKPOINT: THE BOT STARTED. THIS IS NOT AN ERROR MESSAGE');
    world.startup();
  });

  // when the bot is added to new servers
  bot.on('guildCreate', guild => {
    try {
      //add the relationships
      world.addServer(guild);
    }
    catch(ex) { Common.error(ex); }
  });

  // when the bot is removed from servers
  bot.on('guildDelete', guild => {
    try {
      world.removeServer(guild);
    }
    catch(ex) { Common.error(ex); }
  });

  // when a member is removed unfollow
  bot.on('guildMemberRemove', member => {
    try {
      var server = world.servers[member.guild.id];
      if (server.isMaster(member))
      {
        server.release();
      }
    }
    catch(ex) { Common.error(ex); }
  });

  // handle voice state updates
  bot.on('voiceStateUpdate', (oldMember, newMember) => {
    if (!oldMember) return;

    try {
      var server = world.servers[oldMember.guild.id];
      if (!server.isMaster(oldMember))
        return;

      // they've changed voice channels
      if ( oldMember.voiceChannel && (!newMember.voiceChannel || !newMember.voiceChannel.joinable)) { // || oldMember.voiceChannel.id != newMember.voiceChannel.id
        server.release();
      }
      else if ( oldMember.voiceChannel && newMember.voiceChannel && oldMember.voiceChannel.id != newMember.voiceChannel.id )
      {
        server.switchVoiceChannel(newMember.voiceChannel);
      }
    }
    catch(ex) { Common.error(ex); }
  });

  // when messages come in
  bot.on('message', message => {
    try {
      // ignore message from myself
      if ( message.member && message.member.id == bot.user.id ) return;

      var server = null;
      
      // if its in a server and not a DM
      if ( message.guild ) {
        server = world.servers[message.guild.id];

        if (server == null) {
          Common.error("Can't find server for guild id: " + message.guild.id);
          return null;
        }
      }

      // is the message a command?
      if (commands.isCommand(message, server)) {
        commands.process(message, server, world);
      } else if ( message.member ) {
        // say it out loud
        server.speak(message);
      }
    }
    catch(ex) {
      Common.error(ex);
    }
  });

  // if we get disconnected???
  bot.on('disconnect', evt => {
    try {
      world.saveAll();
      world.dispose();
      Common.out('Disconnected, reconnecting');
      Common.out(evt);
      botStuff.connect();
    }
    catch(ex) { Common.error(ex); }
  });

  // capture a whole pile of useful information
  bot.on('error',            Common.error);
  bot.on('guildUnavailable', guild    => Common.error('guild unavailable: ' + guild.id));
  bot.on('rateLimit',        info     => { Common.error('rate limited'); Common.error(info); });
  bot.on('reconnecting',     ()       => Common.error('reconnecting'));
  bot.on('resume',           replayed => Common.error('resume: ' + replayed));
  bot.on('warn',             info     => Common.error('warn:' + info));

  bot.on('disconnect',             info     => Common.error('disconnect:' + info));
  
  // ctrl-c
  process.on('SIGINT', () => world.kill('SIGINT'));

  // something goes wrong we didnt think of or having got around to putting a band-aid fix on
  process.on('uncaughtException', err => { Common.error(err); world.kill('uncaughtException: ' + err.message); });

  // start it up!
  botStuff.connect();

})(); // wtf async.
