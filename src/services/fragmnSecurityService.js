import { AuditLogEvent, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { logger } from '../utils/logger.js';

const joinBuckets = new Map();
const nukeBuckets = new Map();
const nukeActions = new Set([
  AuditLogEvent.ChannelDelete, AuditLogEvent.RoleDelete,
  AuditLogEvent.WebhookCreate, AuditLogEvent.WebhookDelete,
  AuditLogEvent.MemberBanAdd, AuditLogEvent.MemberKick,
  AuditLogEvent.EmojiDelete, AuditLogEvent.StickerDelete,
  AuditLogEvent.RoleCreate, AuditLogEvent.ChannelCreate,
]);
const privilegedPermissions = [
  PermissionFlagsBits.Administrator, PermissionFlagsBits.ManageGuild,
  PermissionFlagsBits.ManageRoles, PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.BanMembers, PermissionFlagsBits.KickMembers,
  PermissionFlagsBits.ManageWebhooks,
];

function enabled(key) { return process.env[key] === 'true'; }
function envNumber(key, fallback, min, max) {
  const value = Number(process.env[key]);
  return Number.isFinite(value) ? Math.max(min, Math.min(max, Math.floor(value))) : fallback;
}
function trustedUsers(guild) {
  const ids = (process.env.FRAGMN_SECURITY_ALLOWED_USER_IDS || '').split(',').map(x => x.trim()).filter(Boolean);
  if (guild?.ownerId) ids.push(guild.ownerId);
  return new Set(ids);
}
async function sendAlert(guild, title, description) {
  const channelId = process.env.FRAGMN_SECURITY_LOG_CHANNEL_ID;
  if (!channelId) {
    logger.warn('FRAG.MN security alert has no log channel', { guildId: guild.id, title });
    return;
  }
  const channel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased?.() || typeof channel.send !== 'function') {
    logger.warn('FRAG.MN security log channel is unavailable', { guildId: guild.id, channelId });
    return;
  }
  const embed = new EmbedBuilder().setColor(0xE53935).setTitle(title)
    .setDescription(description.slice(0, 3900))
    .setFooter({ text: 'FRAG.MN Security • automated detection' }).setTimestamp();
  await channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
}

export async function handleAntiRaidJoin(member) {
  if (!enabled('FRAGMN_ANTI_RAID_ENABLED') || member.user.bot) return;
  const guildId = member.guild.id;
  const now = Date.now();
  const windowMs = envNumber('FRAGMN_ANTI_RAID_WINDOW_MS', 10000, 2000, 120000);
  const threshold = envNumber('FRAGMN_ANTI_RAID_THRESHOLD', 8, 3, 100);
  let bucket = joinBuckets.get(guildId);
  if (!bucket || now - bucket.startedAt > windowMs) {
    bucket = { startedAt: now, memberIds: [], alerted: false };
    joinBuckets.set(guildId, bucket);
  }
  bucket.memberIds.push(member.id);
  if (bucket.memberIds.length < threshold) return;

  if (!bucket.alerted) {
    bucket.alerted = true;
    const ageHours = (now - member.user.createdTimestamp) / 3600000;
    const minAge = envNumber('FRAGMN_ANTI_RAID_MIN_ACCOUNT_AGE_HOURS', 24, 0, 8760);
    await sendAlert(member.guild, '🚨 Anti-Raid: бөөнөөр нэгдэх хөдөлгөөн',
      'Сүүлийн ' + Math.round(windowMs / 1000) + ' секундэд **' + bucket.memberIds.length +
      '** гишүүн нэгдлээ. Босго: **' + threshold + '**.\nСүүлийн гишүүний account age: ' +
      ageHours.toFixed(1) + ' цаг (тохируулсан доод нас: ' + minAge + ' цаг).')
      .catch(error => logger.warn('Anti-Raid alert failed', { error: error.message }));
    logger.warn('FRAG.MN anti-raid threshold reached', { guildId, count: bucket.memberIds.length, threshold, windowMs });
  }

  const quarantineRoleId = process.env.FRAGMN_ANTI_RAID_QUARANTINE_ROLE_ID;
  if (!quarantineRoleId) return;
  const role = member.guild.roles.cache.get(quarantineRoleId) ||
    await member.guild.roles.fetch(quarantineRoleId).catch(() => null);
  const botMember = member.guild.members.me;
  if (!role || !botMember?.permissions.has(PermissionFlagsBits.ManageRoles) ||
      role.position >= botMember.roles.highest.position) {
    logger.warn('Anti-Raid quarantine role unavailable or above bot role', { guildId, quarantineRoleId });
    return;
  }

  for (const userId of bucket.memberIds) {
    const joinedMember = member.guild.members.cache.get(userId) ||
      await member.guild.members.fetch(userId).catch(() => null);
    if (!joinedMember || joinedMember.roles.cache.has(role.id)) continue;
    await joinedMember.roles.add(role, 'FRAG.MN Anti-Raid join burst quarantine')
      .catch(error => logger.warn('Anti-Raid quarantine role failed', { guildId, userId, error: error.message }));
  }
}

async function restrictActor(guild, executorId) {
  const actor = await guild.members.fetch(executorId).catch(() => null);
  const botMember = guild.members.me;
  if (!actor || !botMember?.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return { removed: [], reason: 'actor_or_manage_roles_unavailable' };
  }
  const roles = actor.roles.cache.filter(role =>
    role.id !== guild.id &&
    role.position < botMember.roles.highest.position &&
    role.permissions.any(privilegedPermissions),
  );
  if (!roles.size) return { removed: [], reason: 'no_removable_privileged_roles' };
  const ids = [...roles.keys()];
  await actor.roles.remove(ids, 'FRAG.MN Anti-Nuke: destructive audit-log action burst');
  return { removed: ids, reason: null };
}

export async function handleAntiNukeAuditEntry(entry, eventGuild = null) {
  const guild = eventGuild || entry?.guild || null;
  if (!enabled('FRAGMN_ANTI_NUKE_ENABLED') || !guild || !entry?.executorId || !nukeActions.has(entry.action)) return;
  const executorId = entry.executorId;
  if (executorId === guild.client.user?.id || trustedUsers(guild).has(executorId)) return;

  const now = Date.now();
  const windowMs = envNumber('FRAGMN_ANTI_NUKE_WINDOW_MS', 15000, 2000, 120000);
  const threshold = envNumber('FRAGMN_ANTI_NUKE_THRESHOLD', 4, 2, 30);
  const key = guild.id + ':' + executorId;
  let bucket = nukeBuckets.get(key);
  if (!bucket || now - bucket.startedAt > windowMs) {
    bucket = { startedAt: now, actions: [], alerted: false };
    nukeBuckets.set(key, bucket);
  }
  bucket.actions.push(entry.action);
  if (bucket.actions.length < threshold || bucket.alerted) return;
  bucket.alerted = true;

  let restriction = { removed: [], reason: 'not_attempted' };
  try { restriction = await restrictActor(guild, executorId); }
  catch (error) {
    restriction = { removed: [], reason: error.message };
    logger.error('Anti-Nuke role restriction failed', { guildId: guild.id, executorId, error: error.message });
  }

  await sendAlert(guild, '🛡️ Anti-Nuke: сэжигтэй audit-log үйлдэл',
    'Гишүүн <@' + executorId + '> **' + bucket.actions.length + '** хамгаалалттай үйлдэл ' +
    Math.round(windowMs / 1000) + ' секундэд хийлээ.\nЭрхтэй role хассан: **' +
    restriction.removed.length + '**.\n' + (restriction.reason || 'Эрсдэлтэй role-уудыг хаслаа.'))
    .catch(error => logger.warn('Anti-Nuke alert failed', { error: error.message }));
  logger.warn('FRAG.MN anti-nuke threshold reached', {
    guildId: guild.id, executorId, count: bucket.actions.length, threshold,
    removedRoleIds: restriction.removed, restrictionReason: restriction.reason,
  });
}
