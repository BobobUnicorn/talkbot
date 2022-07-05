import { SlashCommandBuilder } from '@discordjs/builders';
import {
    AutocompleteInteraction,
    Awaitable,
    CommandInteraction,
    GuildMember,
    Message,
    ModalSubmitInteraction,
    TextBasedChannel,
} from 'discord.js';
import { Bot } from 'src/managers/bot.js';
import { GuildModel } from 'src/models/guild.js';

export interface CommandListeners {
    onMessage?: () => void;
    onToken?: () => void;

    onUserJoinedChannel?: () => void;

    onMessageDelivered?: () => void;
    onPreValidate?: () => void;
    onValidate?: () => void;

    onJoinVoice?: () => void;
    onLeaveVoice?: () => void;

    onFollow?: () => void;
    onUnfollow?: () => void;

    onConfigureVoice?: () => void;
}

export interface InteractionContext {
    channel: TextBasedChannel;
    guild: GuildModel;
    bot: Bot;
}

export interface Command {
    name: string;
    hidden: boolean;
    description: string;
    group: string;

    configureBuilder: (builder: SlashCommandBuilder) => Awaitable<void>;

    run: (interaction: CommandInteraction<'cached'>, context: InteractionContext) => Awaitable<unknown>;
    onAutocomplete?: (interaction: AutocompleteInteraction<'cached'>) => Awaitable<unknown>;
    onModalSubmit?: (interaction: ModalSubmitInteraction<'cached'>) => Awaitable<unknown>;

    listeners?: CommandListeners;
}
