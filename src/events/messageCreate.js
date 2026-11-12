import { Events, EmbedBuilder } from 'discord.js';
import { logger } from '../utils/logger.js';
import { parsePrefixCommand } from '../utils/prefixParser.js';
import { supportsPrefixExecution, executePrefixCommand, resolvePrefixAccessKey } from '../utils/messageAdapter.js';
import { resolveCommandAlias, resolveSubcommandAlias } from '../config/commands/commandAliases.js';
import { getPrefixRestriction } from '../config/commands/prefixRestrictions.js';
import { getGuildConfig, patchGuildConfig } from '../services/config/guildConfig.js';
import { getCommandPrefix, getBotMessage, isBotOwner, isCommandCategoryEnabled, isMaintenanceMode } from '../config/bot.js';
import { enforceAbuseProtection, formatCooldownDuration } from '../utils/abuseProtection.js';
import { createEmbed } from '../utils/embeds.js';
import { isCommandEnabled } from '../services/commandAccessService.js';
import { logModerationAction } from '../utils/moderation.js';
import { PermissionFlagsBits } from 'discord.js';
import {
  getCountingGameConfig,
  saveCountingGameConfig,
  isValidCountingMessage,
  recordCorrectCount,
} from '../services/countingGameService.js';

export default {
  name: Events.MessageCreate,
  async execute(message, client) {
    try {
      if (message.author.bot || !message.guild) return;

      logger.debug(`Message received from ${message.author.tag}: ${message.content}`);

      const honeypotProcessed = await handleHoneypot(message, client);
      if (honeypotProcessed) return;

      const countingProcessed = await handleCountingGame(message, client);
      if (countingProcessed) {
        return;
      }

      const autoResponseSent = await handleAutoResponse(message, client);
      if (autoResponseSent) return;

      await handlePrefixCommand(message, client);

    } catch (error) {
      logger.error('Error in messageCreate event:', error);
    }
  }
};


async function handleAutoResponse(message, client) {
  try {
    const config = await getGuildConfig(client, message.guild.id);
    if (config.autoResponsesEnabled === false) return false;

    const prefix = config?.prefix || getCommandPrefix();
    if (!prefix || !message.content.startsWith(prefix)) return false;

    const content = message.content.slice(prefix.length).trimStart();
    if (!content) return false;
    const keyword = content.split(/\s+/, 1)[0].toLowerCase();
    const response = (Array.isArray(config.autoResponses) ? config.autoResponses : [])
      .find((item) => item.enabled !== false && String(item.keyword).trim().replace(/^[!/-]+/, '').toLowerCase() === keyword);

    if (!response) return false;

    const color = /^#[0-9a-f]{6}$/i.test(response.color || '') ? response.color : '#720000';
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(response.title || 'FRAG.MN')
      .setDescription(response.description || 'Мэдээлэл байхгүй.');

    if (response.footer) embed.setFooter({ text: String(response.footer).slice(0, 2048) });
    if (response.image && /^https?:\/\//i.test(response.image)) embed.setImage(response.image);

    await message.channel.send({
      embeds: [embed],
      allowedMentions: { parse: [] },
    });
    return true;
  } catch (error) {
    logger.error('Error handling auto response:', error);
    return false;
  }
}

async function handlePrefixCommand(message, client) {
  try {
    const guildConfig = await getGuildConfig(client, message.guild.id);
    const prefix = guildConfig?.prefix || getCommandPrefix();
    const parsed = parsePrefixCommand(message.content, prefix);
    
    if (!parsed) {
      return; 
    }

    let { commandName, args } = parsed;
    const musicPrefixShortcut = commandName.toLowerCase();
    const MUSIC_PREFIX_SHORTCUTS = new Set(['leave', 'pause', 'resume', 'skip', 'stop', 'volume']);
    if (MUSIC_PREFIX_SHORTCUTS.has(musicPrefixShortcut)) {
      commandName = 'music';
      args = [musicPrefixShortcut, ...args];
    }

    logger.info(`Prefix command detected: ${commandName}, args: ${args.join(', ')}`);

    const resolvedCommandName = resolveCommandAlias(commandName);
    logger.info(`Resolved command name: ${resolvedCommandName}`);
    const command = client.commands.get(resolvedCommandName);

    if (!command) {
      logger.warn(`Command not found: ${resolvedCommandName}`);
      return; 
    }

    if (isMaintenanceMode() && !isBotOwner(message.author.id)) {
      await message.channel.send({
        embeds: [createEmbed({
          title: 'Maintenance Mode',
          description: getBotMessage('maintenanceMode'),
          color: 'warning',
        })],
      }).catch(() => {});
      return;
    }

    if (!isCommandCategoryEnabled(command.category)) {
      await message.channel.send({
        embeds: [createEmbed({
          title: 'Feature Disabled',
          description: getBotMessage('commandDisabled'),
          color: 'error',
        })],
      }).catch(() => {});
      return;
    }

    const restriction = getPrefixRestriction(command, args, resolveSubcommandAlias);
    if (!supportsPrefixExecution(command) || restriction.blocked) {
      if (restriction.blocked && restriction.reason) {
        const embed = createEmbed({
          title: 'Slash Command Only',
          description: `${restriction.reason}\nUse \`/${resolvedCommandName}\` instead.`,
          color: 'info',
        });
        await message.channel.send({ embeds: [embed] }).catch(() => {});
      }
      return;
    }

    if (!(await isCommandEnabled(client, message.guild.id, resolvePrefixAccessKey(command.data, args), command.category))) {
      const embed = createEmbed({
        title: 'Command Disabled',
        description: 'This command has been disabled for this server.',
        color: 'error',
      });
      await message.channel.send({ embeds: [embed] }).catch(() => {});
      return;
    }

    const mockInteractionForProtection = {
      guildId: message.guild.id,
      user: message.author,
    };
    const abuseProtection = await enforceAbuseProtection(
      mockInteractionForProtection,
      command,
      resolvedCommandName,
    );
    if (!abuseProtection.allowed) {
      const formattedCooldown = formatCooldownDuration(abuseProtection.remainingMs);
      const embed = createEmbed({
        title: 'Command Cooldown',
        description: `This command is on cooldown. Please wait ${formattedCooldown} before trying again.`,
        color: 'error',
      });
      await message.channel.send({ embeds: [embed] }).catch(() => {});
      return;
    }

    logger.info(`Executing prefix command: ${prefix}${commandName} (resolved to ${resolvedCommandName}) by ${message.author.tag}`);
    
    await executePrefixCommand(command, message, args, client, prefix, guildConfig);
  } catch (error) {
    logger.error('Error handling prefix command:', error);
  }
}

async function handleCountingGame(message, client) {
  try {
    const config = await getCountingGameConfig(client, message.guild.id);
    if (!config.enabled || !config.channelId || message.channel.id !== config.channelId) {
      return false;
    }

    const content = message.content.trim();
    const validCount = isValidCountingMessage(content, config);
    const invalidAttempt = !validCount || message.author.id === config.lastUserId;

    if (invalidAttempt) {
      await message.delete().catch(() => {});
      await saveCountingGameConfig(client, message.guild.id, {
        ...config,
        nextNumber: 1,
        lastUserId: null,
        currentStreak: 0,
      });

      const failureMessage = await message.channel.send(`❌ Count broken by <@${message.author.id}>. The sequence has been reset to **1**.`);
      setTimeout(() => {
        failureMessage.delete().catch(() => {});
      }, 10000);

      return true;
    }

    await recordCorrectCount(client, message.guild.id, message.author.id);
    return true;
  } catch (error) {
    logger.error('Error handling counting game:', error);
    return false;
  }
}


async function handleHoneypot(message, client) {
  try {
    const config = await getGuildConfig(client, message.guild.id);
    const honeypotChannelId = config.honeypotChannelId;
    if (!honeypotChannelId || message.channel.id !== honeypotChannelId) return false;

    const member = message.member || await message.guild.members.fetch(message.author.id).catch(() => null);
    const isExempt = message.guild.ownerId === message.author.id
      || isBotOwner(message.author.id)
      || member?.permissions?.has(PermissionFlagsBits.Administrator)
      || member?.permissions?.has(PermissionFlagsBits.ManageGuild)
      || member?.permissions?.has(PermissionFlagsBits.ManageMessages)
      || (member && [config.modRole, config.adminRole, ...(config.ticketStaffRoleIds || [])].filter(Boolean).some((roleId) => member.roles.cache.has(roleId)));

    if (isExempt) {
      await message.delete().catch(() => {});
      await refreshHoneypotStickyMessage(message, client, config);
      return true;
    }

    const reason = 'Honeypot channel trigger — automatic softban';
    await message.delete().catch(() => {});

    try {
      await message.guild.members.ban(message.author.id, {
        deleteMessageSeconds: 7 * 24 * 60 * 60,
        reason,
      });

      try {
        await logModerationAction({
          client,
          guild: message.guild,
          event: {
            action: 'Member Softbanned',
            target: `${message.author.tag} (${message.author.id})`,
            executor: `FRAG.MN Honeypot (${client.user.tag})`,
            reason,
            metadata: {
              userId: message.author.id,
              channelId: message.channel.id,
              deleteMessageSeconds: 604800,
              automatic: true,
            },
          },
        });
      } catch (logError) {
        logger.error('Failed to write honeypot moderation log:', logError);
      }

      await message.guild.members.unban(message.author.id, 'Honeypot softban completed').catch((error) => {
        logger.error('Honeypot softban unban failed; user remains banned:', error);
      });

      await updateHoneypotKicks(message, client, config);
    } catch (error) {
      logger.error('Honeypot softban failed:', error);
    }

    return true;
  } catch (error) {
    logger.error('Error handling honeypot message:', error);
    return false;
  }
}


async function updateHoneypotKicks(message, client, config) {
  try {
    const kicks = Number(config.honeypotKicks || 0) + 1;
    await patchGuildConfig(client, message.guild.id, { honeypotKicks: kicks });
    await refreshHoneypotStickyMessage(message, client, {
      ...config,
      honeypotKicks: kicks,
    });
  } catch (error) {
    logger.error('Failed to update honeypot kick counter:', error);
  }
}

async function refreshHoneypotStickyMessage(message, client, config) {
  try {
    const previous = config.honeypotMessageId
      ? await message.channel.messages.fetch(config.honeypotMessageId).catch(() => null)
      : null;

    if (previous) await previous.delete().catch(() => {});

    const embed = new EmbedBuilder()
      .setColor('#2B2D31')
      .setTitle('🍯 DO NOT SEND MESSAGES IN THIS CHANNEL')
      .setDescription('This channel is used to catch spam bots. Any messages sent here will result in **a softban.**')
      .addFields({ name: '🍯 Kicks', value: String(config.honeypotKicks || 0), inline: false });

    const stickyMessage = await message.channel.send({
      embeds: [embed],
      allowedMentions: { parse: [] },
    });
    await stickyMessage.pin().catch(() => {});
    await patchGuildConfig(client, message.guild.id, {
      honeypotMessageId: stickyMessage.id,
    });
  } catch (error) {
    logger.error('Failed to refresh honeypot sticky message:', error);
  }
}
