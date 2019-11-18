/*jshint esversion: 9 */

const Common = require('@helpers/common'),
  auth = require("@auth");

// models
const BotCommand = require('@models/BotCommand');

/**
 * Command: invite
 * sends the invite link for the bot
 *
 * usage !invite
 *
 * @param   {[MessageDetails]}  msg     [message releated helper functions]
 *
 * @return  {[undefined]}
 */
function listVoices(msg) {

  const exampleEmbed = {
    color: 0x0099ff,
    title: `Click to invite the bot to your server`,
    url: `https://discordapp.com/oauth2/authorize?&client_id=428866923267358721&scope=bot&permissions=0`,
    description: 'Add talkbot to your server',
    thumbnail: {
      url: 'https://voices.talkbot.dev/img/face_200.png',
    }
  };

  msg.richResponse(exampleEmbed);
}

var command = new BotCommand({
  command_name: 'invite',
  command_arg: 'i',
  execute: listVoices,
  short_help: 'invite.shorthelp',
  long_help: 'invite.longhelp',
  group: "info"
});


exports.register = function (commands) {
  commands.add(command);
};

exports.unRegister = function (commands) {
  commands.remove(command);
};
