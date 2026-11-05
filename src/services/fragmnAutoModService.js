import { PermissionFlagsBits } from 'discord.js';
import { getGuildConfig } from './config/guildConfig.js';
import { WarningService } from './moderation/warningService.js';
import { logEvent, EVENT_TYPES } from './loggingService.js';
import { logger } from '../utils/logger.js';

const activity = new Map();
const WINDOW_MS = 8_000;
const MESSAGE_LIMIT = 6;
const REPEAT_LIMIT = 3;
const TIMEOUT_MS = 2 * 60_000;
const CLEANUP_INTERVAL_MS = 60_000;
let lastCleanup = Date.now();

function cleanup(now) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, state] of activity) {
    if (!state.messages.length || now - state.messages[state.messages.length - 1].at > WINDOW_MS * 2) {
      activity.delete(key);
    }
  }
}

export async function applyFragmnAutoMod(message, client) {
  try {
    const config = await getGuildConfig(client, message.guild.id);
    const settings = config?.autoMod;
    if (!settings?.enabled || settings.spamEnabled === false) return false;
    if (settings.ignoredChannels?.includes(message.channel.id)) return false;
    if (settings.ignoredRoles?.some((roleId) => message.member?.roles?.cache?.has(roleId))) return false;

    const now = Date.now();
    cleanup(now);
    const key = `${message.guild.id}:${message.author.id}`;
    const state = activity.get(key) || { messages: [], lastAction: 0 };
    state.messages = state.messages.filter((entry) => now - entry.at <= WINDOW_MS);
    const normalized = String(message.content || '').trim().toLowerCase();
    state.messages.push({ at: now, content: normalized });
    const repeats = normalized
      ? state.messages.filter((entry) => entry.content === normalized).length
      : 0;
    activity.set(key, state);

    const triggered = state.messages.length >= MESSAGE_LIMIT || repeats >= REPEAT_LIMIT;
    if (!triggered || now - state.lastAction < 60_000) return false;

    state.lastAction = now;
    state.messages = [];
    activity.set(key, state);

    const reason = state.messages.length >= MESSAGE_LIMIT
      ? '8 секундэд хэт олон мессеж илгээсэн'
      : 'Ижил мессежийг давтан илгээсэн';

    await message.delete().catch(() => null);
    const member = message.member || await message.guild.members.fetch(message.author.id).catch(() => null);
    const botMember = message.guild.members.me;
    const canDelete = message.channel.permissionsFor(botMember)?.has(PermissionFlagsBits.ManageMessages);
    if (!canDelete) {
      logger.warn('FRAG.MN AutoMod triggered but bot lacks ManageMessages permission', {
        guildId: message.guild.id, userId: message.author.id,
      });
    }

    if (member && botMember?.permissions?.has(PermissionFlagsBits.ModerateMembers) &&
        member.moderatable && settings.timeoutEnabled !== false) {
      await member.timeout(TIMEOUT_MS, `FRAG.MN AutoMod: ${reason}`).catch((error) => {
        logger.warn('FRAG.MN AutoMod timeout failed', { guildId: message.guild.id, userId: message.author.id, error: error.message });
      });
    }

    await WarningService.addWarning({
      guildId: message.guild.id,
      userId: message.author.id,
      moderatorId: client.user.id,
      reason: `Автомат хамгаалалт: ${reason}`,
      timestamp: now,
    }).catch((error) => logger.error('FRAG.MN AutoMod warning persistence failed:', error));

    await logEvent({
      client,
      guildId: message.guild.id,
      eventType: EVENT_TYPES.MODERATION_WARN,
      data: {
        title: '🤖 FRAG.MN AutoMod',
        description: 'Автомат хамгаалалт спам үйлдэл илрүүллээ.',
        fields: [
          { name: 'Гишүүн', value: `<@${message.author.id}> (${message.author.id})`, inline: true },
          { name: 'Суваг', value: `<#${message.channel.id}>`, inline: true },
          { name: 'Шалтгаан', value: reason, inline: false },
          { name: 'Арга хэмжээ', value: settings.timeoutEnabled === false ? 'Мессеж устгасан + WARN' : 'Мессеж устгасан + 2 минут timeout оролдсон + WARN', inline: false },
        ],
        userId: message.author.id,
        channelId: message.channel.id,
      },
    });

    return true;
  } catch (error) {
    logger.error('FRAG.MN AutoMod processing failed:', error);
    return false;
  }
}
