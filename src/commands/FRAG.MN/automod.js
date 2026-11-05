import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, EmbedBuilder } from 'discord.js';
import { getGuildConfig, updateGuildConfig } from '../../services/config/guildConfig.js';

const data = new SlashCommandBuilder()
  .setName('frag-automod')
  .setDescription('FRAG.MN автомат спам хамгаалалт удирдах')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand(s => s.setName('status').setDescription('AutoMod төлөв харах'))
  .addSubcommand(s => s.setName('enable').setDescription('Спам хамгаалалт асаах'))
  .addSubcommand(s => s.setName('disable').setDescription('Спам хамгаалалт унтраах'));

export default {
  data,
  category: 'FRAG.MN',
  async execute(interaction) {
    if (!interaction.inGuild()) {
      return interaction.reply({ content: 'Энэ командыг сервер дотор ашиглана уу.', flags: MessageFlags.Ephemeral });
    }
    const action = interaction.options.getSubcommand();
    const config = await getGuildConfig(interaction.client, interaction.guildId);
    const current = config.autoMod || { enabled: false, spamEnabled: true, timeoutEnabled: true };
    if (action !== 'status') {
      await updateGuildConfig(interaction.client, interaction.guildId, {
        autoMod: { ...current, enabled: action === 'enable' },
      });
    }
    const enabled = action === 'status' ? Boolean(current.enabled) : action === 'enable';
    const embed = new EmbedBuilder()
      .setColor(enabled ? 0x2ECC71 : 0xE74C3C)
      .setTitle('🤖 FRAG.MN AutoMod')
      .setDescription(enabled ? 'Спамын автомат хамгаалалт **асаалттай**.' : 'Спамын автомат хамгаалалт **унтраалттай**.')
      .addFields(
        { name: 'Илрүүлэлт', value: '8 секундэд 6+ мессеж эсвэл ижил мессежийг 3 удаа давтах', inline: false },
        { name: 'Арга хэмжээ', value: 'Мессеж устгах, WARN бүртгэх, тохиргооноос хамаарч 2 минут timeout', inline: false },
      )
      .setFooter({ text: 'FRAG.MN • Зөвхөн Manage Server эрхтэй staff удирдана' });
    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
