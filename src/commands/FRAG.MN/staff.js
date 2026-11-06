export const commandGroupOnly = true;
import {
  SlashCommandSubcommandGroupBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder,
} from 'discord.js';
import { addStaffRecord, getStaffRecords } from '../../services/fragmnStaffService.js';

export const staffGroup = new SlashCommandSubcommandGroupBuilder()
  .setName('staff')
  .setDescription('FRAG.MN staff хэрэгслүүд')
  .addSubcommand(s => s.setName('purge').setDescription('Сүүлийн мессежүүд устгах')
    .addIntegerOption(o => o.setName('amount').setDescription('1–100 мессеж').setMinValue(1).setMaxValue(100).setRequired(true)))
  .addSubcommand(s => s.setName('slowmode').setDescription('Slowmode тохируулах')
    .addIntegerOption(o => o.setName('seconds').setDescription('0–21600 секунд').setMinValue(0).setMaxValue(21600).setRequired(true)))
  .addSubcommand(s => s.setName('lock').setDescription('Энэ сувгийг түгжих'))
  .addSubcommand(s => s.setName('unlock').setDescription('Энэ сувгийг нээх'))
  .addSubcommand(s => s.setName('role-add').setDescription('Staff role олгох')
    .addUserOption(o => o.setName('user').setDescription('Гишүүн').setRequired(true))
    .addRoleOption(o => o.setName('role').setDescription('Зөвшөөрөгдсөн staff role').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Шалтгаан').setRequired(false)))
  .addSubcommand(s => s.setName('role-remove').setDescription('Staff role хасах')
    .addUserOption(o => o.setName('user').setDescription('Гишүүн').setRequired(true))
    .addRoleOption(o => o.setName('role').setDescription('Зөвшөөрөгдсөн staff role').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Шалтгаан').setRequired(false)))
  .addSubcommand(s => s.setName('record').setDescription('Staff note, warning эсвэл strike бүртгэх')
    .addUserOption(o => o.setName('user').setDescription('Staff гишүүн').setRequired(true))
    .addStringOption(o => o.setName('type').setDescription('Бүртгэлийн төрөл').setRequired(true)
      .addChoices({name:'Note',value:'note'},{name:'Warning',value:'warning'},{name:'Strike',value:'strike'}))
    .addStringOption(o => o.setName('reason').setDescription('Шалтгаан').setRequired(true)))
  .addSubcommand(s => s.setName('records').setDescription('Staff бүртгэл харах')
    .addUserOption(o => o.setName('user').setDescription('Staff гишүүн').setRequired(true)));

const ephemeral = content => ({
  content,
  flags: MessageFlags.Ephemeral,
  allowedMentions: { parse: [] },
});

function configuredStaffRoleIds() {
  return (process.env.FRAGMN_STAFF_ROLE_IDS || '').split(',').map(id => id.trim()).filter(Boolean);
}

async function manageStaffRole(interaction, action) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles)) {
    return interaction.reply(ephemeral('Manage Roles эрх шаардлагатай.'));
  }

  const allowlist = configuredStaffRoleIds();
  if (!allowlist.length) {
    return interaction.reply(ephemeral('FRAGMN_STAFF_ROLE_IDS тохируулаагүй байна. Staff role ID-уудаа hosting environment-д нэмнэ үү.'));
  }

  const user = interaction.options.getUser('user', true);
  const role = interaction.options.getRole('role', true);
  const reason = interaction.options.getString('reason') || 'FRAG.MN staff management';
  if (!allowlist.includes(role.id)) {
    return interaction.reply(ephemeral('Энэ role FRAGMN_STAFF_ROLE_IDS зөвшөөрөгдсөн жагсаалтад байхгүй.'));
  }
  if (role.managed || role.id === interaction.guild.id || role.permissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply(ephemeral('Энэ role-ийг staff командаар олгох/хасах боломжгүй.'));
  }

  const [target, botMember] = await Promise.all([
    interaction.guild.members.fetch(user.id).catch(() => null),
    interaction.guild.members.fetchMe().catch(() => null),
  ]);
  if (!target || !botMember) return interaction.reply(ephemeral('Гишүүн эсвэл bot member олдсонгүй.'));
  if (target.id === interaction.guild.ownerId || target.id === interaction.user.id) {
    return interaction.reply(ephemeral('Server owner эсвэл өөрийн staff role-ийг энэ командаар өөрчлөхгүй.'));
  }
  if (target.roles.highest.position >= interaction.member.roles.highest.position) {
    return interaction.reply(ephemeral('Таны role-той ижил эсвэл түүнээс өндөр гишүүний role-ийг өөрчилж болохгүй.'));
  }
  if (role.position >= interaction.member.roles.highest.position || role.position >= botMember.roles.highest.position) {
    return interaction.reply(ephemeral('Таны болон bot-ийн хамгийн өндөр role-оос доор байрлах staff role сонгоно уу.'));
  }

  if (action === 'add') {
    await target.roles.add(role, 'FRAG.MN staff by ' + interaction.user.tag + ': ' + reason);
  } else {
    await target.roles.remove(role, 'FRAG.MN staff by ' + interaction.user.tag + ': ' + reason);
  }

  await addStaffRecord({
    guildId: interaction.guildId,
    userId: target.id,
    moderatorId: interaction.user.id,
    type: action === 'add' ? 'role_added' : 'role_removed',
    reason: role.name + ': ' + reason,
  });

  return interaction.reply(ephemeral(
    (action === 'add' ? '✅ ' : '➖ ') + role.name + ' role ' +
    (action === 'add' ? 'олголоо.' : 'хаслаа.') + ' Гишүүн: ' + target.user.tag,
  ));
}

export async function executeStaffCommand(interaction) {
    if (!interaction.inGuild()) return interaction.reply(ephemeral('Энэ командыг серверт ашиглана уу.'));
    const action = interaction.options.getSubcommand();

    try {
      if (action === 'purge') {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
          return interaction.reply(ephemeral('Manage Messages эрх шаардлагатай.'));
        }
        const deleted = await interaction.channel.bulkDelete(interaction.options.getInteger('amount', true), true);
        return interaction.reply(ephemeral('🧹 ' + deleted.size + ' мессеж устгалаа. 14 хоногоос хуучин мессежийг Discord bulk delete хийхгүй.'));
      }

      if (['slowmode', 'lock', 'unlock'].includes(action)) {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
          return interaction.reply(ephemeral('Manage Channels эрх шаардлагатай.'));
        }
        if (!interaction.channel?.permissionOverwrites) {
          return interaction.reply(ephemeral('Энэ командыг текст сувагт ашиглана уу.'));
        }
        if (action === 'slowmode') {
          const seconds = interaction.options.getInteger('seconds', true);
          await interaction.channel.setRateLimitPerUser(seconds, 'FRAG.MN staff: ' + interaction.user.tag);
          return interaction.reply(ephemeral(seconds ? '✅ Slowmode: ' + seconds + ' секунд.' : '✅ Slowmode унтарлаа.'));
        }
        await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
          SendMessages: action === 'lock' ? false : null,
        }, { reason: 'FRAG.MN staff action by ' + interaction.user.tag });
        return interaction.reply(ephemeral(action === 'lock' ? '🔒 Сувгийг түгжлээ.' : '🔓 Сувгийг нээлээ.'));
      }

      if (action === 'role-add') return await manageStaffRole(interaction, 'add');
      if (action === 'role-remove') return await manageStaffRole(interaction, 'remove');

      if (action === 'record') {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles)) {
          return interaction.reply(ephemeral('Manage Roles эрх шаардлагатай.'));
        }
        const target = interaction.options.getUser('user', true);
        const record = await addStaffRecord({
          guildId: interaction.guildId,
          userId: target.id,
          moderatorId: interaction.user.id,
          type: interaction.options.getString('type', true),
          reason: interaction.options.getString('reason', true),
        });
        return interaction.reply(ephemeral('📝 Staff бүртгэл хадгаллаа. ID: ' + record.id));
      }

      if (action === 'records') {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles)) {
          return interaction.reply(ephemeral('Manage Roles эрх шаардлагатай.'));
        }
        const target = interaction.options.getUser('user', true);
        const records = await getStaffRecords({ guildId: interaction.guildId, userId: target.id });
        if (!records.length) return interaction.reply(ephemeral('Энэ гишүүнд staff бүртгэл алга.'));
        const lines = records.slice(0, 12).map(record => {
          const time = Math.floor(new Date(record.createdAt).getTime() / 1000);
          return '**' + String(record.type).toUpperCase() + '** • <t:' + time + ':R>\n' +
            'Шалтгаан: ' + String(record.reason).slice(0, 350) + '\n' +
            'Бүртгэсэн: <@' + record.moderatorId + '> • ID: ' + record.id;
        });
        const embed = new EmbedBuilder()
          .setColor(0xE53935)
          .setTitle('FRAG.MN • Staff records')
          .setDescription(lines.join('\n\n').slice(0, 3900))
          .setFooter({ text: target.tag + ' • хамгийн сүүлийн 12 бүртгэл' });
        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
      }
    } catch (error) {
      return interaction.reply(ephemeral('Үйлдэл амжилтгүй: ' + String(error.message || 'Алдаа').slice(0, 300))).catch(() => {});
    }
}
